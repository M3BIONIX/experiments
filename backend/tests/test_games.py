import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import chess
import numpy as np
import pytest
from game import validate_ttt, validate_chess, winner, render_board, choose_move

def test_ttt_rejects_illegal_and_terminal_positions():
    for p in ['.........','OO.......','XXXOO....','X........X','X..A.....']:
        with pytest.raises(ValueError):validate_ttt(p)
    assert validate_ttt('X........')==list(range(1,9))

def test_ttt_exhaustive_legal_games():
    seen=set()
    def visit(s):
        if s in seen:return
        seen.add(s)
        if winner(s):return
        mark='X' if s.count('X')==s.count('O') else 'O'
        if mark=='O':
            assert validate_ttt(s)==[i for i,c in enumerate(s) if c=='.']
            m,_,_=choose_move('tic-tac-toe',s,np.arange(1,65,dtype=float))
            assert s[int(m)]=='.'
        for i,c in enumerate(s):
            if c=='.':visit(s[:i]+mark+s[i+1:])
    visit('.........')
    assert len(seen)==5478

def test_readout_is_causal_and_masks_occupied_cells():
    rates=np.zeros(64);rates[0]=999;rates[4]=3
    assert choose_move('tic-tac-toe','X........',rates)[0]=='4'
    rates[8]=4
    assert choose_move('tic-tac-toe','X........',rates)[0]=='8'
    with pytest.raises(ValueError):choose_move('tic-tac-toe','X........',np.zeros(64))
    only_occupied=np.zeros(64);only_occupied[0]=99
    assert choose_move('tic-tac-toe','X........',only_occupied)==('1',0.0,8)

def test_chess_outputs_legal_moves():
    board=chess.Board();board.push_uci('e2e4')
    move,_,_=choose_move('chess',board.fen(),np.arange(1,65,dtype=float))
    assert chess.Move.from_uci(move) in board.legal_moves
    with pytest.raises(ValueError):validate_chess(chess.STARTING_FEN)

def test_visual_input_changes_with_board():
    assert not np.array_equal(render_board('tic-tac-toe','X........'),render_board('tic-tac-toe','....X....'))
    assert render_board('tic-tac-toe','X........').shape==(128,128,3)


def test_sparse_chess_output_returns_explicit_zero_tie():
    board=chess.Board();board.push_uci('e2e4')
    rates=np.zeros(64);rates[chess.A1]=1
    move,score,ties=choose_move('chess',board.fen(),rates)
    assert move==sorted(m.uci() for m in board.legal_moves)[0]
    assert score==0 and ties==board.legal_moves.count()

@pytest.mark.parametrize('seed',range(20))
def test_long_chess_games_with_sparse_outputs(seed):
    rng=np.random.default_rng(seed);board=chess.Board()
    for ply in range(400):
        if board.is_game_over():break
        if board.turn==chess.WHITE:
            moves=list(board.legal_moves);move=moves[int(rng.integers(len(moves)))]
        else:
            rates=np.zeros(64);rates[int(rng.integers(64))]=1
            uci,_,_=choose_move('chess',board.fen(),rates);move=chess.Move.from_uci(uci)
        assert move in board.legal_moves
        board.push(move);assert board.is_valid()

@pytest.mark.parametrize('fen,expected',[
 ('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1','e8g8'),
 ('4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1','d4e3'),
 ('4k3/8/8/8/8/8/p7/4K3 b - - 0 1','a2a1q'),
])
def test_special_moves(fen,expected):
    board,moves=validate_chess(fen)
    assert chess.Move.from_uci(expected) in moves
    rates=np.zeros(64);rates[chess.Move.from_uci(expected).to_square]=10
    move,_,_=choose_move('chess',fen,rates)
    assert chess.Move.from_uci(move) in board.legal_moves

@pytest.mark.parametrize('fen',[
 '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',
 '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
 '7k/8/6K1/8/8/8/8/8 b - - 0 1',
])
def test_terminal_chess_rejected(fen):
    with pytest.raises(ValueError):validate_chess(fen)
