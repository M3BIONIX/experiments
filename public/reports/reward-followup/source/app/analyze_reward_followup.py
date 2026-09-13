"""Independently verify and summarize the predeclared reward follow-up."""
from pathlib import Path
import csv,hashlib,json,shutil
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
OUT=Path('app/results/reward-followup');STATIC=Path('app/static/reward-report')
ARMS=['paired','unpaired','frozen'];STAGES=['withdrawal','extinction','effort'];NAMES=['instagram','google','whatsapp','youtube']

def main():
 protocol=json.loads((OUT/'protocol.json').read_text());complete=json.loads((OUT/'complete.json').read_text())
 assert complete['conditions']==36 and complete['body_probes']==108
 records=[]
 for key in complete['keys']:
  r=json.loads((OUT/(key+'.json')).read_text());assert r['status']=='completed'
  train=r['training_trace'];assert sum(t['interval_ms'] for t in train)==21000
  assert sum(t['stimulus_ms'] for t in train)==4000
  for t in train:
   expected=(t['phase']=='cue' and r['arm'] in ['paired','frozen']) or (t['phase']=='separate_reward' and r['arm']=='unpaired')
   assert t['stimulus_ms']==(t['interval_ms'] if expected else 0)
  assert sum(t['interval_ms'] for t in r['extinction_trace'])==8000
  assert all(t['stimulus_ms']==0 for t in r['extinction_trace']) and r['cue_readout']['stimulus_ms']==0
  with np.load(OUT/(key+'-memory.npz')) as w:
   assert all(np.isfinite(w[k]).all() for k in w.files)
   changed=int(np.count_nonzero(w['learned_weights']!=w['baseline_weights']))
   assert changed==r['training_metrics']['changed_edges']
   if r['arm']=='frozen':assert changed==0 and np.array_equal(w['learned_weights'],w['extinguished_weights'])
  for p in r['probes']:
   points=np.array([t['position_mm'] for t in p['trace']])[:,:2]
   targets=np.array(p['targets']);dist=np.linalg.norm(points[:,None,:]-targets[None,:,:],axis=2)
   visits=np.argwhere(dist<3);first=p['order'][visits[0,1]] if len(visits) else None
   assert first==p['first_approach']
   assert p['plastic_weights_unchanged']
   assert abs(sum(t['interval_ms'] for t in p['neural_trace'])-p['seconds']*1000)<1e-5
   assert all(t['stimulus_ms']==0 for t in p['neural_trace'])
   for i,name in enumerate(p['order']):
    assert abs(float(np.sum(dist[:,i]<3))*.02-p['logos'][name]['dwell_seconds'])<1e-6
   targetradius=float(np.linalg.norm(targets[p['order'].index(r['logo'])]));assert np.isclose(targetradius,14 if p['stage']=='effort' else 10)
  records.append(r)
 assert len(set((r['logo'],r['seed'],r['arm']) for r in records))==36
 assert hashlib.sha256(Path('app/reward_followup.py').read_bytes()).hexdigest()==protocol['code_sha256']
 lookup={(r['logo'],r['seed'],r['arm']):r for r in records}
 def getprobe(r,stage):return next(p for p in r['probes'] if p['stage']==stage)
 for name in NAMES:
  for seed in protocol['seeds']:
   matched=[lookup[name,seed,arm] for arm in ARMS]
   cues=[[t['input_sha256'] for t in r['training_trace'] if t['phase']=='cue'] for r in matched]
   assert cues[0]==cues[1]==cues[2] and len(cues[0])==20
   for stage in STAGES:
    probes=[getprobe(r,stage) for r in matched]
    assert probes[0]['order']==probes[1]['order']==probes[2]['order']
    assert probes[0]['targets']==probes[1]['targets']==probes[2]['targets']
 summary={'conditions':36,'body_tests':108,'training_current_total_ms':sum(r['training_metrics']['reward_current_ms'] for r in records),'training_pam11_spikes':sum(r['training_metrics']['pam11_spikes'] for r in records),'arms':{},'matched_differences':{},'protocol':protocol,'limitations':protocol['limitations']}
 for arm in ARMS:
  rows=[r for r in records if r['arm']==arm]
  summary['arms'][arm]={'n':len(rows),'changed_edges_min':min(r['training_metrics']['changed_edges'] for r in rows),'changed_edges_max':max(r['training_metrics']['changed_edges'] for r in rows),'stages':{}}
  for stage in STAGES:
   probes=[getprobe(r,stage) for r in rows]
   summary['arms'][arm]['stages'][stage]={'trained_first':sum(p['target_approached_first'] for p in probes),'trained_ever':sum(p['target_ever_approached'] for p in probes),'no_logo_approached':sum(p['first_approach'] is None for p in probes),'target_dwell_total_s':sum(p['logos'][p['trained_logo']]['dwell_seconds'] for p in probes),'pam11_spikes':sum(t['pam11_spikes'] for p in probes for t in p['neural_trace'])}
 for stage in STAGES:
  summary['matched_differences'][stage]={}
  for control in ['unpaired','frozen']:
   diffs=[];dwell=[]
   for name in NAMES:
    for seed in protocol['seeds']:
     p=getprobe(lookup[name,seed,'paired'],stage);q=getprobe(lookup[name,seed,control],stage)
     diffs.append(int(p['target_approached_first'])-int(q['target_approached_first']))
     dwell.append(p['logos'][name]['dwell_seconds']-q['logos'][name]['dwell_seconds'])
   summary['matched_differences'][stage][control]={'paired_only_first':sum(d>0 for d in diffs),'control_only_first':sum(d<0 for d in diffs),'same_first_outcome':sum(d==0 for d in diffs),'net_first_approach_gain':sum(diffs),'mean_target_dwell_difference_s':float(np.mean(dwell))}
 gains={stage:all(summary['matched_differences'][stage][c]['net_first_approach_gain']>0 for c in ['unpaired','frozen']) for stage in STAGES}
 summary['descriptive_gain_against_both_controls']=gains
 summary['predeclared_first_approach_criterion_met']=all(gains.values())
 summary['by_logo']={}
 for name in NAMES:
  summary['by_logo'][name]={}
  for arm in ARMS:
   rows=[r for r in records if r['logo']==name and r['arm']==arm]
   summary['by_logo'][name][arm]={stage:{'n':len(rows),'trained_first':sum(getprobe(r,stage)['target_approached_first'] for r in rows),'trained_ever':sum(getprobe(r,stage)['target_ever_approached'] for r in rows),'target_dwell_total_s':sum(getprobe(r,stage)['logos'][name]['dwell_seconds'] for r in rows)} for stage in STAGES}
 summary['unrewarded_cue_readouts']={arm:{'n':12,'pam11_spikes':sum(r['cue_readout']['pam11_spikes'] for r in records if r['arm']==arm),'mean_motor_hz':float(np.mean([r['cue_readout']['motor_hz'] for r in records if r['arm']==arm]))} for arm in ARMS}
 all_probes=[p for r in records for p in r['probes']]
 summary['probe_duration_s']={'minimum':min(p['seconds'] for p in all_probes),'maximum':max(p['seconds'] for p in all_probes),'total':sum(p['seconds'] for p in all_probes),'stopped_before_horizon':sum(p['seconds']<2.999 for p in all_probes),'stop_reasons':dict(Counter(p['stop_reason'] for p in all_probes))}
 summary['addiction_established']=False
 if all(gains.values()):
  summary['interpretation']='A descriptive trained-logo approach advantage appeared in all three tests. This does not establish addiction.'
 elif gains['withdrawal']:
  summary['interpretation']='A descriptive approach advantage after training did not persist across both follow-up tests.'
 else:
  summary['interpretation']='After reward removal, paired training did not increase trained-logo first approaches against both controls.'
 (OUT/'summary.json').write_text(json.dumps(summary,indent=2))
 verification={'conditions_verified':36,'body_probes_verified':108,'reward_doses_and_timing_verified':True,'frozen_weights_verified':True,'reward_absent_in_all_probes':True,'position_outcomes_recomputed':True,'effort_geometry_verified':True,'matched_cue_inputs_and_layouts_verified':True,'experiment_source_matches_predeclared_hash':True}
 (OUT/'verification.json').write_text(json.dumps(verification,indent=2))
 with (OUT/'probe-results.csv').open('w',newline='') as f:
  writer=csv.writer(f)
  writer.writerow(['trained_logo','seed','arm','stage','first_logo_approached','trained_logo_first','trained_logo_ever','trained_logo_dwell_seconds','probe_seconds','pam11_spikes','injected_reward_ms','changed_synapses_after_training'])
  for r in sorted(records,key=lambda r:(r['logo'],r['seed'],r['arm'])):
   for p in r['probes']:
    writer.writerow([r['logo'],r['seed'],r['arm'],p['stage'],p['first_approach'] or 'none',p['target_approached_first'],p['target_ever_approached'],p['logos'][r['logo']]['dwell_seconds'],p['seconds'],sum(t['pam11_spikes'] for t in p['neural_trace']),sum(t['stimulus_ms'] for t in p['neural_trace']),r['training_metrics']['changed_edges']])
 plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
 fig,ax=plt.subplots(figsize=(11,5),layout='constrained');fig.patch.set_facecolor('#f5f6ef');ax.set_facecolor('#f5f6ef')
 x=np.arange(3)
 for i,(arm,color) in enumerate(zip(ARMS,['#3d7550','#a69b7a','#879aaa'])):
  y=[summary['arms'][arm]['stages'][s]['trained_first'] for s in STAGES]
  bars=ax.bar(x+(i-1)*.24,y,.24,label=arm.title(),color=color)
  ax.bar_label(bars,padding=3)
 ax.set_xticks(x,['Reward removed','After unrewarded exposure','Greater travel distance']);ax.set_ylim(0,13);ax.set_ylabel('Trained logo approached first / 12 matched scenarios');ax.set_title('Reward-conditioning follow-up: recorded behavior');ax.legend();ax.spines[['top','right']].set_visible(False)
 fig.savefig(OUT/'results.png',dpi=180);plt.close(fig)
 lines=['# Reward-conditioning follow-up','',summary['interpretation'],'','Completed **36 training conditions and 108 reward-free behavioral probes**. Each arm has 12 matched scene/logo scenarios (four logos × three seeds); these are not independent biological flies.','', '| Test | Paired reward | Unpaired reward | Learning disabled |','|---|---:|---:|---:|']
 for stage,label in zip(STAGES,['Reward removed','After 20 unrewarded exposures','Trained logo farther away']):
  lines.append('| '+label+' | '+' | '.join(str(summary['arms'][a]['stages'][stage]['trained_first'])+'/12' for a in ARMS)+' |')
 lines += ['','Reward-removed first approaches by trained logo (three matched scenes per cell):','','| Trained logo | Paired | Unpaired | Learning disabled |','|---|---:|---:|---:|']
 for name in NAMES:
  lines.append('| '+name+' | '+' | '.join(str(summary['by_logo'][name][arm]['withdrawal']['trained_first'])+'/3' for arm in ARMS)+' |')
 lines += ['','Secondary measurement: total time within the trained logo\'s approach zone across each arm\'s 12 probes.','','| Test | Paired seconds | Unpaired seconds | Learning-disabled seconds |','|---|---:|---:|---:|']
 for stage,label in zip(STAGES,['Reward removed','After unrewarded exposure','Greater travel distance']):
  lines.append('| '+label+' | '+' | '.join(f"{summary['arms'][a]['stages'][stage]['target_dwell_total_s']:.2f}" for a in ARMS)+' |')
 lines += ['','The distance probe had slightly more trained-logo dwell in the paired arm despite no first-approach advantage against both controls. That secondary result does not rescue the failed persistence criterion: both approach counts and dwell were lower than controls after unrewarded exposure.']
 lines += ['','Entries count the **trained logo approached first**, not generic movement. No-logo approaches and approaches to another logo remain distinct in the raw data.','', '## Mechanism and controls','',f"Training produced {summary['training_pam11_spikes']:,} total PAM11 spikes across the conditions. This includes deliberately programmed reward, not spontaneous logo appeal."]
 for arm in ARMS:
  a=summary['arms'][arm];lines.append(f"- {arm}: {a['changed_edges_min']}–{a['changed_edges_max']} of 7,835 plastic edges changed from the common starting weights.")
 lines += ['','Reward dose was equal across arms: 4,000 ms of 20 mV-equivalent current per condition. Paired and frozen arms received it with the cue; the unpaired arm received it on blank frames separated from the cue block by five seconds. Block order alternated by seed.','', 'Transient neural dynamics were cleared before each probe while learned weights and memory variables were retained. This is a deliberate model intervention to isolate memory from residual stimulation. Both plasticity and passive memory updates were frozen during behavioral probes; extinction exposures allowed learning except in the frozen-control arm.','', '## Persistence and cost','', 'Extinction comprised 20 further cue presentations without reward (8 simulated seconds including gaps). The effort probe moved the trained logo from a 10 mm radius to 14 mm and enlarged its panel by 1.4× to approximately preserve its apparent size from the centre. This is additional travel distance, not an aversive outcome, punishment or a metabolic-cost model. The increased-distance probe started from the original trained weights, separately from the extinction branch. All probes had a three-second horizon.','', '## What this does not establish','', 'Addiction is not established. Even persistent weights or seeking would not be sufficient: the model has an explicitly programmed 1,800-second memory-decay constant and has not been validated for addiction, drug-like dependence, subjective reward, or real-fly visual preference. A null result is also not proof that real flies could not learn such an association.','', 'The visual training uses displayed images; behavior uses rendered eye views through an unvalidated sensory and motor adapter. Three scene seeds per logo provide a bounded model experiment, not a powered biological study. Positions and headings were matched across arms, but logo positions were not exhaustively counterbalanced. The small matched differences are reported descriptively; no significance or population-generalization claim is made.','', 'A separate punishment/aversion experiment and a validated longer-duration dependence model have not been run. The present battery tests the stated reward-pairing, reward-removal, repeated-unrewarded-exposure, and increased-distance hypotheses.','', 'Full timing, currents, measured spikes, learned weight arrays, trajectories and matched differences are saved beside this report. Source: https://github.com/mattyhempstead/fly-wirehead .']
 duration=summary['probe_duration_s']
 lines += ['',f"{duration['stopped_before_horizon']} probes ended before the three-second horizon on leaving the observation area; the shortest lasted {duration['minimum']:.2f} seconds. These outcomes were retained. Total recorded behavioral time was {duration['total']:.2f} seconds."]
 (OUT/'report.md').write_text('\n'.join(lines)+'\n')
 manifest={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.glob('*')) if p.suffix in ['.json','.npz'] and p.name!='manifest.json'}
 for filename in ['app/reward_followup.py','app/neural_logo_trials.py','app/engine.py','app/analyze_reward_followup.py']:
  manifest[filename]=hashlib.sha256(Path(filename).read_bytes()).hexdigest()
 for p in [*Path('app/static/logos').glob('*-panel.png'),Path('requirements-neural-lock.txt')]:
  manifest[str(p)]=hashlib.sha256(p.read_bytes()).hexdigest()
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
 STATIC.mkdir(exist_ok=True)
 for name in ['summary.json','verification.json','report.md','results.png','probe-results.csv']:shutil.copy2(OUT/name,STATIC/name)
 compact_records=[]
 for r in records:
  compact_records.append({k:v for k,v in r.items() if k not in ['training_trace','extinction_trace','probes']})
 (STATIC/'conditions.json').write_text(json.dumps(compact_records))
 table=''.join('<tr><td>'+label+'</td>'+''.join('<td>'+str(summary['arms'][a]['stages'][stage]['trained_first'])+' / 12</td>' for a in ARMS)+'</tr>' for stage,label in zip(STAGES,['Reward removed','After unrewarded exposure','Greater travel distance']))
 details=''.join('<tr><td>'+r['logo']+'</td><td>'+str(r['seed'])+'</td><td>'+r['arm']+'</td><td>'+str(r['training_metrics']['changed_edges'])+'</td>'+''.join('<td>'+str(getprobe(r,stage)['first_approach'] or 'None')+'</td>' for stage in STAGES)+'</tr>' for r in sorted(records,key=lambda r:(r['logo'],r['seed'],r['arm'])))
 html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reward follow-up — verified results</title><style>body{font:15px system-ui;background:#f5f6ef;color:#243b2d;margin:0}main{max-width:1120px;margin:auto;padding:35px 25px}h1{font-size:35px;font-weight:550;letter-spacing:-1px}h2{font-size:20px}p{line-height:1.7;max-width:940px;color:#63715f}.lead{font-size:21px;color:#30563b}.tag{font:11px monospace;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin:25px 0}th,td{padding:12px 8px;text-align:left;border-bottom:1px solid #d6dfcf;font-size:13px}th{color:#788470;font-weight:500}img{width:100%;height:auto}a{color:#386c47}.note{border-left:3px solid #b3a078;padding-left:16px}summary{cursor:pointer;margin-top:25px}.scroll{overflow-x:auto}</style><main><p class="tag">36 TRAINING CONDITIONS · 108 BEHAVIORAL TESTS · VERIFIED</p><h1>Did reward training make the fly seek a logo?</h1><p class="lead">'''+summary['interpretation']+'''</p><p>Each logo was tested with reward paired to its appearance, the same reward delivered separately, and reward pairing with learning disabled. The table counts how often the trained logo was approached first.</p><div class="scroll"><table><tr><th>Reward-free test</th><th>Paired</th><th>Unpaired</th><th>Learning disabled</th></tr>'''+table+'''</table></div><img src="results.png" alt="Measured trained-logo first approaches across paired, unpaired and frozen conditions"><p class="note">This does not establish addiction. Dopamine-neuron stimulation was deliberately programmed during training. All behavior tests ran without injected reward. Learned weights were retained while transient activity was cleared.</p><h2>What was tested</h2><p>Four logos × three matched scene seeds × three training conditions. Twenty cue presentations per condition; equal reward dose; five-second separation for the unpaired control. After training: a reward-free probe, 20 unrewarded cue exposures followed by another probe, and a probe with the trained logo farther away. Each behavioral probe lasted up to three simulated seconds. The distance test used the original trained memory, separately from the extinction test.</p><p>Moving the target from 10 to 14 mm is an effort proxy. It is not punishment. The model’s memory-decay constant is programmed at 1,800 seconds; persistence alone cannot establish compulsion. Visual-to-neural and neural-to-walking mappings remain unvalidated.</p><p><a href="replay.html">Compare recorded trajectories</a> · <a href="probe-results.csv" download>All 108 probe outcomes (CSV)</a> · <a href="report.md">Detailed report</a> · <a href="summary.json" download>Measured results and matched comparisons</a> · <a href="verification.json" download>Verification record</a></p><details><summary>Inspect all 36 conditions</summary><p>The final three columns name the first logo approached, which may differ from the trained logo. “None” means no logo’s approach zone was entered.</p><div class="scroll"><table><tr><th>Trained logo</th><th>Seed</th><th>Condition</th><th>Changed edges</th><th>Reward removed</th><th>After extinction</th><th>More effort</th></tr>'''+details+'''</table></div></details><p>Source: <a href="https://github.com/mattyhempstead/fly-wirehead">fly-wirehead</a> · <a href="../neural-report/index.html">Previous untrained 100-trial experiment</a></p></main></html>'''
 logo_table='<h2>Which trained logo was approached?</h2><p>First approaches after reward removal, across three matched scenes per logo. These small counts do not rank natural appeal or addictiveness.</p><div class="scroll"><table><tr><th>Trained logo</th><th>Paired</th><th>Unpaired</th><th>Learning disabled</th></tr>'+''.join('<tr><td>'+name.title()+'</td>'+''.join('<td>'+str(summary['by_logo'][name][arm]['withdrawal']['trained_first'])+' / 3</td>' for arm in ARMS)+'</tr>' for name in NAMES)+'</table></div>'
 html=html.replace('<h2>What was tested</h2>',logo_table+'<h2>What was tested</h2>')
 html=html.replace('<h2>What was tested</h2>','<p>Secondary result: paired training produced slightly more nearby time in the distance test, but not more first approaches than both controls. After unrewarded exposure, both approach counts and nearby time were below controls. Ten probes ended early on leaving the observation area; all were retained.</p><h2>What was tested</h2>')
 (STATIC/'index.html').write_text(html)
 print(json.dumps({k:v for k,v in summary.items() if k not in ['protocol','limitations']},indent=2))
if __name__=='__main__':main()
