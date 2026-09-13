"""An explicit behavioral gate, separate from transport/rules tests.

Four consecutive reversals are a prototype cycle diagnostic, not a chess rating.
Run after compare_readouts.py. Exit 1 means the player is still repetitive.
"""
import json,sys
from pathlib import Path
path=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/readout-comparison.json')
report=json.loads(path.read_text());failures=[]
for run in report['runs']:
    if run['mode']!='raw':continue
    streak=0;longest=0;reversals=0
    for previous,current in zip(run['moves'],run['moves'][1:]):
        reverse=current[:2]==previous[2:4] and current[2:4]==previous[:2]
        streak=streak+1 if reverse else 0;longest=max(longest,streak);reversals+=int(reverse)
    assert reversals==run['immediate_reversals']
    if longest>=4:failures.append(f"seed {run['seed']}: {reversals}/{run['replies']} reversals, longest run {longest}")
if failures:
    print('FAIL: the neural chess readout exhibits repeated back-and-forth play.\n'+'\n'.join(failures));sys.exit(1)
print('PASS: no long reversal cycles in this sample. This does not establish chess strength.')
