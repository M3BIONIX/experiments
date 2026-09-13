"""Connectome-driven trials and separate equal-exposure logo assays.
No artificial PAM11 drive; no addiction score or dopamine concentration.
"""
import hashlib,json,time,subprocess
from collections import Counter
from pathlib import Path
import numpy as np
from PIL import Image,ImageEnhance
from app.engine import Experiment,NAMES
from flywirehead.engine import FlyEngine
from flywirehead.data import verify

OUT=Path('app/results/neural-logo-100');OUT.mkdir(parents=True,exist_ok=True)
def save(name,data):
 p=OUT/name;t=p.with_suffix('.tmp');t.write_text(json.dumps(data,allow_nan=False));t.replace(p)
def compact(t):return {k:v for k,v in t.items() if k!='bins'}

class NeuralExperiment(Experiment):
 def __init__(self,engine,seed):
  self.neural=None;super().__init__(seed=seed)
  self.neural=engine;self.telemetry=[];self.last_neural=None
 def sense(self):
  super().sense()
  if self.neural is None:return
  # Engineering adapter: two rendered eyes side by side, resized to upstream display.
  frame=np.asarray(Image.fromarray(np.concatenate(list(self.eye),axis=1)).resize((90,160),Image.Resampling.BILINEAR))
  t=self.neural.observe(frame,20,video_reward=False)
  assert t['stimulus_ms']==0
  self.last_neural=compact(t);self.telemetry.append(self.last_neural)
  speed=min(1.2,max(0,t['motor_hz']/25))
  turn=np.clip(t['turn_hz']/30,-.5,.5)
  self.command=np.array([speed*(1-turn),speed*(1+turn)])

def main():
 start=time.monotonic();verified=verify();e=FlyEngine(frozen=False)
 save('protocol.json',{'graph':verified,'repo_commit':subprocess.check_output(['git','-C','vendor/fly-wirehead','rev-parse','HEAD'],text=True).strip(),'engine_sha256':hashlib.sha256(Path('app/engine.py').read_bytes()).hexdigest(),'adapter_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'body_seeds':list(range(1,101)),'body_horizon_s':3,'body_timestep_s':e.brain.dt/1000,'observation_ms':20,'body_controller':'MN9/DNp09 mean rate /25 clipped to [0,1.2]; DNa02 R-L /30 clipped to [-.5,.5]; left/right = speed*(1-/+turn)','visual_adapter':'left/right rendered fisheye images concatenated horizontally and resized to 90x160; unvalidated projection','artificial_reward':False,'plasticity':'enabled within body trial; reset before each independent trial; frozen for isolated logo comparison','choice':'first entry within 3 mm of a panel centre; no entry = no choice','isolated_assays':'25 matched image variants per logo plus 25 blank controls; 200 ms per exposure after reset and 1500 ms white conditioning','dopamine_metric':'15 PAM11 cells: spikes per neuron per neural second, not concentration','addiction_metric':None})
 print('GRAPH VERIFIED',verified,flush=True)
 # Calibrating to the upstream assay state avoids comparing only initial transients.
 def condition():
  e.brain.reset();e.pending_pulse_ms=0
  for _ in range(3):e.observe(np.full((160,90,3),255,np.uint8),500,video_reward=False)
 condition()
 # Save the conditioned dynamic state in memory. No learned logo history crosses trials.
 conditioned={k:getattr(e.brain,k).copy() for k in e.brain.fields}
 scalars={k:getattr(e.brain,k) for k in ['cursor','sim_ms','total_spikes']}
 weights=e.brain.weight[e.brain.circuit['edges']].copy()
 def restore(frozen):
  for k,v in conditioned.items():getattr(e.brain,k)[:]=v
  for k,v in scalars.items():setattr(e.brain,k,v)
  e.brain.weight[e.brain.circuit['edges']]=weights;e.brain.weights_frozen=frozen;e.pending_pulse_ms=0
 # Positive stimulation is a separately labelled mechanism check, never a logo result.
 white=np.full((160,90,3),255,np.uint8)
 restore(True);white_control=compact(e.observe(white,200,video_reward=False))
 restore(True);dark_control=compact(e.observe(np.zeros_like(white),200,video_reward=False))
 restore(True);e.stimulate();positive=compact(e.observe(white,200,video_reward=False))
 restore(True);replay=compact(e.observe(white,200,video_reward=False))
 assert white_control['spike_sha256']==replay['spike_sha256']
 assert dark_control['spike_sha256']!=white_control['spike_sha256']
 assert positive['pam11_spikes']>white_control['pam11_spikes']
 assert len(e.brain.circuit['reward'])==15
 save('mechanism-checks.json',{'white':white_control,'black':dark_control,'artificial_positive_control':positive,'exact_replay':True})
 print('MECHANISM CHECKS PASSED',flush=True)
 # Direct logo exposure, equal time and matched transforms, unlike attribution from mixed arena views.
 assays=[]
 for variant in range(25):
  rng=np.random.default_rng(10000+variant);size=int(rng.integers(48,79));dx=int(rng.integers(-5,6));dy=int(rng.integers(-15,16));brightness=float(rng.uniform(.8,1))
  for name in [*NAMES,'blank']:
   canvas=Image.new('RGB',(90,160),'white')
   if name!='blank':
    logo=Image.open(f'app/static/logos/{name}-panel.png').convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
    canvas.paste(logo,((90-size)//2+dx,(160-size)//2+dy))
   frame=np.asarray(ImageEnhance.Brightness(canvas).enhance(brightness))
   restore(True);t=compact(e.observe(frame,200,video_reward=False));assert t['stimulus_ms']==0
   assays.append({'variant':variant+1,'logo':name,'size_px':size,'dx':dx,'dy':dy,'brightness':brightness,**t})
  save('isolated-assays.json',assays)
  print(f'ASSAYS {variant+1}/25 groups | wall {time.monotonic()-start:.1f}s',flush=True)
 body=[]
 for seed in range(1,101):
  restore(False);exp=None
  try:
   exp=NeuralExperiment(e,seed)
   while exp.stop_reason is None and exp.elapsed<3:exp.advance()
   if exp.stop_reason is None:exp.stop_reason='Three-second neural trial completed'
   total_ms=sum(t['interval_ms'] for t in exp.telemetry)
   record={'seed':seed,'status':'completed','order':exp.order,'initial_heading_rad':exp.initial_heading,'seconds':exp.elapsed,'first_entry':exp.first_entry,'stop_reason':exp.stop_reason,'pam11_spikes':sum(t['pam11_spikes'] for t in exp.telemetry),'mean_pam11_hz':sum(t['pam11_spikes'] for t in exp.telemetry)/(15*total_ms/1000),'network_spikes':sum(t['total_spikes'] for t in exp.telemetry),'logos':{n:{'dwell_seconds':float(exp.dwell[i]),'minimum_distance_mm':float(exp.min_dist[i])} for i,n in enumerate(exp.order)},'trace':exp.trace,'neural_trace':exp.telemetry}
  except Exception as ex:
   record={'seed':seed,'status':'error','error':repr(ex)}
   raise
  finally:
   if exp:exp.close()
  save(f'trial-{seed:03d}.json',record);body.append({k:v for k,v in record.items() if k not in ['trace','neural_trace']})
  save('progress.json',{'completed':len(body),'total':100,'trials':body,'wall_seconds':time.monotonic()-start})
  print(f"BODY {seed}/100 | first={record['first_entry']} | PAM11={record['mean_pam11_hz']:.3f} Hz | wall {time.monotonic()-start:.1f}s",flush=True)
 counts=Counter(r['first_entry'] or 'no_choice' for r in body)
 summary={'completed':len(body),'choice_counts':{n:counts[n] for n in [*NAMES,'no_choice']},'pam11_by_logo':{n:{'mean_hz':float(np.mean([a['pam11_hz'] for a in assays if a['logo']==n])),'total_spikes':sum(a['pam11_spikes'] for a in assays if a['logo']==n),'min_hz':min(a['pam11_hz'] for a in assays if a['logo']==n),'max_hz':max(a['pam11_hz'] for a in assays if a['logo']==n)} for n in [*NAMES,'blank']},'body':body,'assays':assays,'wall_seconds':time.monotonic()-start}
 save('summary.json',summary);print('COMPLETE',json.dumps(summary['choice_counts']),flush=True)
if __name__=='__main__':main()
