"""Game rules and explicit board-to-image / neural-to-action adapters."""
import hashlib
import chess
import numpy as np
from PIL import Image, ImageDraw

LINES = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]

def winner(board):
    for a,b,c in LINES:
        if board[a] != '.' and board[a] == board[b] == board[c]:
            return board[a]
    return 'draw' if '.' not in board else None

def validate_ttt(board):
    if len(board) != 9 or set(board) - set('XO.'):
        raise ValueError('Expected nine X, O, or . cells.')
    if board.count('X') != board.count('O') + 1 or winner(board):
        raise ValueError('The fly plays O after X, in an unfinished game.')
    return [i for i,c in enumerate(board) if c == '.']

def validate_chess(fen):
    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise ValueError('Invalid chess position.') from e
    if not board.is_valid() or board.turn != chess.BLACK or board.is_game_over():
        raise ValueError('The fly plays Black in a valid, unfinished position.')
    return board, sorted(board.legal_moves, key=lambda m:m.uci())

def render_board(game, position):
    """128px square board. Symbols and board coordinates are engineered visual stimuli."""
    size = 8 if game == 'chess' else 3
    cells = []
    if game == 'chess':
        board = chess.Board(position)
        for row in range(8):
            for col in range(8):
                piece = board.piece_at(chess.square(col,7-row))
                cells.append(piece.symbol() if piece else '.')
    else:
        cells = list(position)
    im = Image.new('RGB', (128,128), (128,128,128))
    draw = ImageDraw.Draw(im)
    for i,mark in enumerate(cells):
        row,col = divmod(i,size)
        x0,y0,x1,y1 = col*128//size,row*128//size,(col+1)*128//size,(row+1)*128//size
        shade = 155 if (row+col)%2 else 205
        draw.rectangle((x0,y0,x1-1,y1-1),fill=(shade,shade,shade))
        if mark != '.':
            light = mark.isupper() if game == 'chess' else mark == 'X'
            fill = (245,245,245) if light else (25,25,25)
            draw.ellipse((x0+2,y0+2,x1-3,y1-3),fill=fill)
            draw.text(((x0+x1)//2,(y0+y1)//2),mark.upper(),anchor='mm',fill=(25,25,25) if light else (245,245,245))
    return np.asarray(im).copy()

def choose_move(game, position, rates):
    """Assign legal actions to measured pools with a reproducible position-keyed shuffle.

    No piece values or origin/destination bonuses. This engineered adapter removes
    permanently favored squares; it does not teach chess or optimize good moves.
    Full FEN includes the move counter so revisiting a board need not repeat a cycle.
    """
    if len(rates) != 64 or not np.isfinite(rates).all() or max(rates) <= 0:
        raise ValueError('No measured output activity. No substitute move was generated.')
    if game == 'chess':
        _, legal = validate_chess(position)
        moves = [m.uci() for m in legal]
    else:
        moves = [str(i) for i in validate_ttt(position)]
    def key(value):
        return hashlib.sha256(f'readout-v2:{game}:{position}:{value}'.encode()).digest()
    moves.sort(key=lambda move:key('move:'+move))
    pools = sorted(range(64),key=lambda pool:key('pool:'+str(pool)))
    scored = [(move,float(rates[pools[i % 64]])) for i,move in enumerate(moves)]
    best = max(score for _,score in scored)
    tied = [move for move,score in scored if score == best]
    return tied[0], best, len(tied)
