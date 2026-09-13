"""MaleCNS neural runtime. No game engine, random player, or learned policy fallback."""
import hashlib
import os
import sys
import time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('FLYWIREHEAD_DATA',str(ROOT/'data'))
sys.path.insert(0,str(ROOT/'vendor'))
from flywirehead.data import verify
from flywirehead.neural.visual import VisualMemoryBrain
from flywirehead.neural.common import annotations
from game import render_board, choose_move

class Brain:
    def __init__(self):
        self.provenance=verify()
        self.model=VisualMemoryBrain()
        self.model.weights_frozen=True
        a=annotations(self.model.ids)
        labels=a.type.fillna('')
        self.spatial_indices=np.array([i for i,v in enumerate(a.somaLocation) if v is not None and len(v)==3],dtype=np.int32)
        raw=np.array([a.somaLocation.iloc[i] for i in self.spatial_indices],dtype=np.float32)
        self.geometry=dict(indices=self.spatial_indices.tolist(), positions=raw.astype(int).ravel().tolist(),
            count=len(self.spatial_indices), total=self.model.n, coordinate_space='MaleCNS EM, 8 nm isotropic voxels',
            source='https://male-cns.janelia.org/download/', representation='Reconstructed neuron cell-body positions; not full neurite skeletons.')
        outputs=np.flatnonzero(labels.str.startswith('DN').to_numpy())
        if len(outputs)<64:
            raise RuntimeError('Not enough annotated descending neurons for 64 output pools.')
        outputs=outputs[np.argsort(self.model.ids[outputs])]
        self.pools=np.array_split(outputs,64)
        self.output_count=len(outputs)

    def respond(self,game,position,on_activity=None):
        started=time.perf_counter()
        image=render_board(game,position)
        # Independent, replayable decision trials: no shared game state or synthetic reward.
        self.model.reset()
        counts=np.zeros(self.model.n,dtype=np.int64)
        activity_bins=[]
        callback_seconds=0.0
        for step in range(10):
            interval_counts,_=self.model.rgb_step(image,10.0,learning=False)
            counts += interval_counts
            activity_bins.append(dict(end_ms=(step+1)*10,
                rates_hz=[float(interval_counts[group].mean()/0.01) for group in self.pools]))
            if on_activity:
                before=time.perf_counter()
                local=interval_counts[self.spatial_indices]
                fired=np.flatnonzero(local)
                on_activity(dict(type='activity',end_ms=(step+1)*10,
                    indices=fired.tolist(),counts=local[fired].astype(int).tolist(),
                    total_spikes=int(interval_counts.sum()),mapped_spikes=int(local.sum())))
                callback_seconds += time.perf_counter()-before
        rates=np.array([counts[group].mean()/0.1 for group in self.pools])
        move,score,ties=choose_move(game,position,rates)
        return dict(move=move,telemetry=dict(
            **self.provenance, output_neurons=self.output_count,
            total_spikes=int(counts.sum()), output_spikes=int(sum(counts[g].sum() for g in self.pools)),
            simulated_ms=100,compute_seconds=round(time.perf_counter()-started-callback_seconds,3),
            selected_score=score,tied_moves=ties,output_rates_hz=rates.tolist(),
            activity_bins=activity_bins,
            input_sha256=hashlib.sha256(image.tobytes()).hexdigest(),
            spike_sha256=hashlib.sha256(counts.tobytes()).hexdigest(),
            readout='Fixed descending-neuron pools; destination + 0.25 origin for chess; cell pool for tic tac toe. Ties use UCI/cell order.',
            learning=False))
