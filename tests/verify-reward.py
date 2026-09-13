"""Verify imported follow-up integrity and the measurements shown on the page."""
import csv
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
folder = root / 'public/reports/reward-followup'
manifest = json.loads((folder / 'manifest.json').read_text())
for name, expected in manifest.items():
    path = folder / name.split('reward-followup/')[-1] if 'reward-followup/' in name else folder / 'source' / name
    assert path.is_file(), name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
rows = list(csv.DictReader((folder / 'probe-results.csv').open()))
assert len(rows) == 108
shown = json.loads((root / 'src/reward-results.json').read_text())
for index, stage in enumerate(['withdrawal', 'extinction', 'effort']):
    for column, arm in enumerate(['paired', 'unpaired', 'frozen']):
        group = [r for r in rows if r['stage'] == stage and r['arm'] == arm]
        assert len(group) == 12
        assert all(float(r['injected_reward_ms']) == 0 for r in group)
        assert sum(r['trained_logo_first'] == 'True' for r in group) == shown[index]['counts'][column]
        assert round(sum(float(r['trained_logo_dwell_seconds']) for r in group), 2) == shown[index]['dwell'][column]
        if arm == 'frozen':
            assert all(int(r['changed_synapses_after_training']) == 0 for r in group)
print(f'All {len(manifest)} source hashes and 108 probe rows verified; page counts and dwell match.')
