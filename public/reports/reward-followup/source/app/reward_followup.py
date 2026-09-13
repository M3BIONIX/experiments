"""Predeclared conditioning, withdrawal, extinction and effort-cost battery.
Model-specific learned seeking only; no biological addiction inference.
"""
import hashlib,json,time,multiprocessing as mp,subprocess
from pathlib import Path
import numpy as np
import mujoco as mj
from PIL import Image
from flywirehead.engine import FlyEngine
from flywirehead.data import verify
from app.neural_logo_trials import NeuralExperiment,compact,NAMES

OUT=Path('app/results/reward-followup')
ARMS=['paired','unpaired','frozen']
SEEDS=[101,102,103]
PAIRINGS=20

def save(name,data):
 p=OUT/name;t=p.with_suffix('.tmp');t.write_text(json.dumps(data,allow_nan=False));t.replace(p)

def initialize():
 global e,base,scalars,baseweights
 e=FlyEngine(frozen=False)
 for _ in range(3):e.observe(np.full((160,90,3),255,np.uint8),500,video_reward=False)
 b=e.brain
 base={k:getattr(b,k).copy() for k in b.fields}
 scalars={k:getattr(b,k) for k in ['cursor','sim_ms','total_spikes']}
 baseweights=b.weight[b.circuit['edges']].copy()

def reset_memory(memory=None,frozen=False):
 b=e.brain
 for k,v in base.items():getattr(b,k)[:]=v
 for k,v in scalars.items():setattr(b,k,v)
 b.weight[b.circuit['edges']]=baseweights
 if memory:
  for k in ['memory_u','memory_w']:getattr(b,k)[:]=memory[k]
  b.weight[b.circuit['edges']]=memory['weights']
 b.weights_frozen=frozen;e.pending_pulse_ms=0
 assert not np.any(b.drive[b.circuit['reward']])

def memory():
 b=e.brain
 return {'memory_u':b.memory_u.copy(),'memory_w':b.memory_w.copy(),'weights':b.weight[b.circuit['edges']].copy()}

def cue_images(name,seed):
 rng=np.random.default_rng(seed+7000)
 logo=Image.open(f'app/static/logos/{name}-panel.png').convert('RGB')
 frames=[]
 for _ in range(PAIRINGS):
  size=int(rng.integers(50,79));dx=int(rng.integers(-5,6));dy=int(rng.integers(-15,16))
  im=Image.new('RGB',(90,160),'white');im.paste(logo.resize((size,size),Image.Resampling.LANCZOS),((90-size)//2+dx,(160-size)//2+dy));frames.append(np.asarray(im))
 return frames

def observe(frame,ms,reward,phase):
 t=compact(e.observe(frame,ms,video_reward=reward));t['phase']=phase
 assert t['stimulus_ms']==(ms if reward else 0)
 return t

def probe(name,seed,stage,mem):
 reset_memory(mem,frozen=True)
 exp=None
 try:
  exp=NeuralExperiment(e,seed)
  if stage=='effort':
   i=exp.order.index(name)
   exp.targets[i]*=1.4
   geom=exp.sim.mj_model.geom('panel'+str(i))
   geom.pos[:2]=exp.targets[i];geom.pos[2]*=1.4;geom.size[:2]*=1.4
   # Keep centre-view angular size approximately matched while adding 4 mm of travel.
   mj.mj_forward(exp.sim.mj_model,exp.sim.mj_data)
  while exp.stop_reason is None and exp.elapsed<3:exp.advance()
  return {'stage':stage,'seed':seed,'trained_logo':name,'first_approach':exp.first_entry,'seconds':exp.elapsed,'stop_reason':exp.stop_reason or 'Three-second probe completed','order':exp.order,'targets':exp.targets.tolist(),'target_approached_first':exp.first_entry==name,'target_ever_approached':bool(exp.dwell[exp.order.index(name)]>0),'logos':{n:{'dwell_seconds':float(exp.dwell[i]),'minimum_distance_mm':float(exp.min_dist[i])} for i,n in enumerate(exp.order)},'trace':exp.trace,'neural_trace':exp.telemetry,'plastic_weights_unchanged':bool(np.array_equal(e.brain.weight[e.brain.circuit['edges']],mem['weights']))}
 finally:
  if exp:exp.close()

def run_condition(task):
 name,seed,arm=task;key=f'{name}-{seed}-{arm}';path=OUT/(key+'.json')
 if path.exists():
  r=json.loads(path.read_text());assert r['status']=='completed';return key
 reset_memory(frozen=arm=='frozen')
 frames=cue_images(name,seed);blank=np.full((160,90,3),255,np.uint8);training=[]
 # Equal cue exposure and equal reward duration across paired/unpaired/frozen.
 # Five seconds between cue and unpaired reward: five eligibility-trace constants.
 # Reverse block order for alternating seeds to counterbalance temporal ordering.
 def cue_block():
  for frame in frames:
   training.append(observe(frame,200,arm in ['paired','frozen'],'cue'))
   training.append(observe(blank,200,False,'cue_gap'))
 def reward_block():
  for _ in frames:
   training.append(observe(blank,200,arm=='unpaired','separate_reward'))
   training.append(observe(blank,200,False,'separate_gap'))
 first,second=(cue_block,reward_block) if seed%2 else (reward_block,cue_block)
 first()
 for _ in range(10):training.append(observe(blank,500,False,'washout'))
 second()
 learned=memory();w=learned['weights']
 changed=int(np.count_nonzero(w!=baseweights))
 assert sum(t['stimulus_ms'] for t in training)==4000
 if arm=='frozen':assert changed==0
 preprobe={'changed_edges':changed,'mean_weight_change':float(np.mean(w-baseweights)),'max_absolute_weight_change':float(np.max(np.abs(w-baseweights))),'plastic_edge_count':len(w),'pam11_spikes':sum(t['pam11_spikes'] for t in training),'reward_current_ms':sum(t['stimulus_ms'] for t in training),'kc_spikes':sum(t['kc_spikes'] for t in training)}
 # Isolated cue readout distinguishes neural response changes from body-adapter transfer.
 reset_memory(learned,frozen=True)
 cue_readout=observe(frames[0],200,False,'unrewarded_cue_test')
 immediate=probe(name,seed,'withdrawal',learned)
 reset_memory(learned,frozen=arm=='frozen')
 extinction=[]
 for frame in frames:
  extinction.append(observe(frame,200,False,'extinction_cue'))
  extinction.append(observe(blank,200,False,'extinction_gap'))
 extinguished=memory()
 after_extinction=probe(name,seed,'extinction',extinguished)
 effort=probe(name,seed,'effort',learned)
 for p in [immediate,after_extinction,effort]:
  assert p['plastic_weights_unchanged']
  assert all(t['stimulus_ms']==0 for t in p['neural_trace'])
 r={'status':'completed','key':key,'logo':name,'seed':seed,'arm':arm,'training_metrics':preprobe,'training_trace':training,'cue_readout':cue_readout,'extinction_trace':extinction,'extinction_changed_edges':int(np.count_nonzero(extinguished['weights']!=w)),'probes':[immediate,after_extinction,effort]}
 save(key+'.json',r)
 np.savez_compressed(OUT/(key+'-memory.npz'),learned_weights=w,learned_u=learned['memory_u'],learned_w=learned['memory_w'],extinguished_weights=extinguished['weights'],baseline_weights=baseweights)
 return key

def main():
 OUT.mkdir(exist_ok=True)
 tasks=[(n,s,a) for n in NAMES for s in SEEDS for a in ARMS]
 protocol={'status':'predeclared','graph':verify(),'repo_commit':subprocess.check_output(['git','-C','vendor/fly-wirehead','rev-parse','HEAD'],text=True).strip(),'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'logos':NAMES,'seeds':SEEDS,'arms':ARMS,'conditions':len(tasks),'body_probes':len(tasks)*3,'cue_pairings':20,'cue_ms':200,'gap_ms':200,'interblock_washout_ms':5000,'eligibility_trace_ms':1000,'reward_current_mv':20,'reward_total_ms_per_condition':4000,'training_duration_ms':21000,'extinction_exposures':20,'extinction_duration_ms':8000,'probe_horizon_s':3,'effort_target_radius_mm':14,'normal_target_radius_mm':10,'effort_size_multiplier':1.4,'transient_state':'Same white-conditioned dynamics restored before all probes; learned weights and memory_u/w retained. Thus no residual reward current is tested.','probe_plasticity':'Frozen to measure retained memory without probe-induced changes. Extinction exposure learns except in frozen arm.','comparison':'Paired versus matched unpaired and frozen conditions for trained-logo first approach, ever approach, and dwell. No-choice retained.','success_criteria':'Evidence of learned seeking requires paired training to increase trained-logo approach relative to BOTH unpaired and frozen controls; persistence requires that advantage after extinction; effort persistence requires that advantage at increased distance. Report matched differences without treating small deterministic scenario samples as biological population estimates.','addiction_claim':False,'limitations':['Not a validated biological addiction model','Three independent scene seeds per logo; one reconstructed connectome','Retained rule memory decay is programmed at 1800 seconds','Increased distance is an effort proxy, not an aversive stimulus or punishment','Display-cue training to rendered-eye arena transfer is unvalidated','No concentration, subjective pleasure or drug-like dependence measurements']}
 if (OUT/'protocol.json').exists():assert json.loads((OUT/'protocol.json').read_text())['code_sha256']==protocol['code_sha256']
 else:save('protocol.json',protocol)
 done=[];start=time.monotonic()
 with mp.get_context('spawn').Pool(4,initializer=initialize) as pool:
  for key in pool.imap_unordered(run_condition,tasks,chunksize=1):
   r=json.loads((OUT/(key+'.json')).read_text())
   done.append(key);save('progress.json',{'completed_conditions':len(done),'total_conditions':len(tasks),'completed_keys':done,'wall_seconds':time.monotonic()-start})
   print(f"DONE {len(done)}/{len(tasks)} {key} edges={r['training_metrics']['changed_edges']} probes={[p['first_approach'] for p in r['probes']]} wall={time.monotonic()-start:.1f}s",flush=True)
 save('complete.json',{'conditions':len(done),'body_probes':len(done)*3,'wall_seconds':time.monotonic()-start,'keys':done})
 print('BATTERY COMPLETE',flush=True)
if __name__=='__main__':main()
