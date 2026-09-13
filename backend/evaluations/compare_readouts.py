"""Behavioral comparison; repeated legal replies are counted as failures of variety."""
import sys,json,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import chess,numpy as np
from brain import Brain
from game import render_board
brain=Brain();counts=np.zeros(brain.model.n,dtype=np.int64);brain.model.reset()
for _ in range(10):c,_=brain.model.rgb_step(render_board('chess','8/8/8/8/8/8/8/8 w - - 0 1'),10,learning=False);counts+=c
baseline=np.array([counts[g].mean()/.1 for g in brain.pools]);results=[]
for mode in ['raw','baseline_difference']:
 for seed in [0,1,2]:
  rng=random.Random(seed);b=chess.Board();replies=[];reversals=0;max_streak=0;streak=0
  for i in range(30):
   if b.is_game_over():break
   b.push(rng.choice(list(b.legal_moves)))
   if b.is_game_over():break
   response=brain.respond('chess',b.fen());rates=np.array(response['telemetry']['output_rates_hz'])
   if mode=='baseline_difference':rates-=baseline
   legal=sorted(b.legal_moves,key=lambda m:m.uci());m=max(legal,key=lambda m:rates[m.to_square]+.25*rates[m.from_square])
   reverse=bool(replies and m.from_square==replies[-1].to_square and m.to_square==replies[-1].from_square)
   reversals+=int(reverse);streak=streak+1 if reverse else 0;max_streak=max(streak,max_streak);replies.append(m);b.push(m)
  result=dict(mode=mode,seed=seed,replies=len(replies),immediate_reversals=reversals,max_reversal_streak=max_streak,moves=[m.uci() for m in replies],outcome=b.result());results.append(result);print(mode,seed,'reversals',reversals,'/',len(replies),'max streak',max_streak,flush=True)
Path('/tmp/readout-comparison.json').write_text(json.dumps(dict(baseline=baseline.tolist(),runs=results),indent=2))
