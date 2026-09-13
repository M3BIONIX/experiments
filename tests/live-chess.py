"""Actual HTTP neural simulation regression, no mock move responses."""
import chess,json,urllib.request,random,time
from pathlib import Path
results=[]
for seed in range(3):
 b=chess.Board();rng=random.Random(seed);turns=0
 for ply in range(80):
  if b.is_game_over():break
  b.push(rng.choice(list(b.legal_moves)))
  if b.is_game_over():break
  req=urllib.request.Request('http://127.0.0.1:8001/api/brain/play',data=json.dumps(dict(game='chess',position=b.fen())).encode(),headers={'Content-Type':'application/json'})
  started=time.monotonic()
  events=[json.loads(x) for x in urllib.request.urlopen(req,timeout=45)]
  last=events[-1]
  assert last['type']=='result',(b.fen(),last)
  assert len([e for e in events if e['type']=='activity'])==10
  move=chess.Move.from_uci(last['move']);assert move in b.legal_moves
  assert sum(e['total_spikes'] for e in events if e['type']=='activity')==last['telemetry']['total_spikes']
  b.push(move);turns+=1
  results.append(dict(seed=seed,turn=turns,move=move.uci(),seconds=round(time.monotonic()-started,2),score=last['telemetry']['selected_score']))
  print(seed,turns,move.uci(),flush=True)
 print('END',seed,b.result(),b.outcome(),flush=True)
Path('/tmp/live-chess-results.json').write_text(json.dumps(results,indent=2))
