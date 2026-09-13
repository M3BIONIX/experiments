"""Actual neural games; report variety without claiming strategic ability."""
import json,random,sys
from pathlib import Path
from collections import Counter
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import chess
from brain import Brain
brain=Brain();runs=[]
for seed in range(3):
 rng=random.Random(seed);board=chess.Board();moves=[];pieces=Counter();reversals=0;streak=longest=0
 for turn in range(30):
  if board.is_game_over():break
  board.push(rng.choice(list(board.legal_moves)))
  if board.is_game_over():break
  result=brain.respond('chess',board.fen());move=chess.Move.from_uci(result['move'])
  assert move in board.legal_moves
  reverse=bool(moves and move.from_square==chess.Move.from_uci(moves[-1]).to_square and move.to_square==chess.Move.from_uci(moves[-1]).from_square)
  reversals+=int(reverse);streak=streak+1 if reverse else 0;longest=max(longest,streak)
  pieces[board.piece_at(move.from_square).symbol()]+=1;moves.append(move.uci());board.push(move)
 run=dict(seed=seed,replies=len(moves),reversals=reversals,longest_reversal_streak=longest,pieces=dict(pieces),moves=moves);runs.append(run);print(json.dumps(run),flush=True)
out=dict(readout='Position-keyed balanced assignment v2',runs=runs,strategic_strength_tested=False)
(Path(__file__).resolve().parents[2]/'public/reports/chess/position-readout-evaluation.json').write_text(json.dumps(out,indent=2)+'\n')
assert all(r['longest_reversal_streak']<4 for r in runs)
assert sum(r['reversals'] for r in runs)<sum(r['replies'] for r in runs)*.25
