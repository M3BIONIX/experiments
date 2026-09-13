"""Recount the copied recordings, independently of the report HTML."""
import json,hashlib,math,collections
from pathlib import Path
p=Path('public/reports/neural-logo');manifest=json.loads((p/'source-manifest.json').read_text())
for name,digest in manifest['sha256'].items():assert hashlib.sha256((p/name).read_bytes()).hexdigest()==digest,name
counts=collections.Counter();spikes=0
for i in range(1,101):
 r=json.loads((p/f'trial-{i:03}.json').read_text());choice=None
 for t in r['trace']:
  for logo,target in zip(r['order'],[(10,0),(0,10),(-10,0),(0,-10)]):
   if math.dist(t['position_mm'][:2],target)<3:
    choice=logo;break
  if choice:break
 counts[choice or 'no_choice']+=1
 spikes+=sum(n['total_spikes'] for n in r['neural_trace'])
s=json.loads((p/'summary.json').read_text());assert dict(counts)==s['choice_counts'],(counts,s['choice_counts'])
assert spikes==369323006,spikes
print('Verified 100 recordings, source file hashes, independently recounted first approaches and',spikes,'spikes.',dict(counts))
a=json.loads((p/'isolated-assays.json').read_text());display=json.loads(Path('src/logo-results.json').read_text())
assert display['network_spikes']==sum(r['total_spikes'] for r in a)
for shown in display['assays']:
 rows=[r for r in a if r['logo']==shown['logo']]
 assert shown['exposures']==len(rows)==25
 assert shown['pam11_spikes']==sum(r['pam11_spikes'] for r in rows)==0
 assert shown['mean_hz']==sum(r['pam11_hz'] for r in rows)/len(rows)==0
control=json.loads((p/'mechanism-checks.json').read_text())['artificial_positive_control']
assert display['positive_control']['pam11_spikes']==control['pam11_spikes']==262
print('Verified rendered assay values against all 125 raw exposures and the separate positive control.')
