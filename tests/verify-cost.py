"""Check imported records and independently recount all displayed walking results."""
import csv,hashlib,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'public/reports/cost-learning'
manifest=json.loads((folder/'manifest.json').read_text())
for name,digest in manifest.items():
 assert hashlib.sha256((folder/name).read_bytes()).hexdigest()==digest,name
rows=list(csv.DictReader((folder/'probes.csv').open()))
assert len(rows)==192
shown=json.loads((root/'src/cost-results.json').read_text())
original=json.loads((folder/'summary.json').read_text())
assert shown['arms']==original['arms']
for arm in ['paired','unpaired','frozen']:
 for stage in ['withdrawal','after_extinction','high_cost','punishment']:
  subset=[r for r in rows if r['arm']==arm and r['stage']==stage];assert len(subset)==16
  totals=shown['arms'][arm]['stages'][stage]
  for field,column in [('trained_first','trained_first'),('penalty_experienced','penalty_experienced')]:
   assert sum(r[column]=='True' for r in subset)==totals[field]
  for field in ['distance_mm','returns_after_delivered_penalty']:
   assert math.isclose(sum(float(r[field]) for r in subset),totals[field],abs_tol=1e-8)
print(f'{len(manifest)} file hashes verified; 192 rows recounted; displayed totals match.')
