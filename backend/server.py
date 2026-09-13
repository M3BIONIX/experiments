"""Neural game API. A single bounded inference runs at a time."""
import asyncio
import json
import logging
import os
import tempfile
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Literal
from game import validate_chess,validate_ttt

state={'status':'loading','message':'Loading the fly neural simulation.'}
brain=None
lock=threading.Lock()

def load():
    global brain
    try:
        from brain import Brain
        brain=Brain()
        state.update(status='ready',message='Fly neural simulation ready.',**brain.provenance)
    except Exception:
        logging.exception('Neural initialization failed')
        state.update(status='unavailable',message='Neural data is unavailable. Run the backend preparation command and restart.')

@asynccontextmanager
async def lifespan(app):
    task=asyncio.create_task(asyncio.to_thread(load))
    yield
    await task

app=FastAPI(lifespan=lifespan)
class Turn(BaseModel):
    game: Literal['chess','tic-tac-toe']
    position: str = Field(min_length=1,max_length=120)

@app.middleware('http')
async def local_origin(request:Request,call_next):
    origin=request.headers.get('origin')
    if origin and origin not in {'http://localhost:5173','http://127.0.0.1:5173','http://localhost:4173','http://127.0.0.1:4173','https://experiments.m3bionix.com'} | set(filter(None,os.environ.get('ALLOWED_ORIGINS','').split(','))):
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail':'This origin is not allowed.'},status_code=403)
    if request.method == 'POST' and int(request.headers.get('content-length','0')) > 2048:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail':'Request too large.'},status_code=413)
    return await call_next(request)

@app.get('/api/brain/status')
def status():
    return state

@app.post('/api/brain/move')
def move(turn:Turn):
    try:
        validate_chess(turn.position) if turn.game=='chess' else validate_ttt(turn.position)
    except ValueError as e:
        raise HTTPException(422,str(e)) from e
    if state['status']!='ready':
        raise HTTPException(503,state['message'])
    if not lock.acquire(blocking=False):
        raise HTTPException(429,'The fly is responding to another move. Try again shortly.')
    try:
        result=brain.respond(turn.game,turn.position)
        log=Path(os.environ.get('FLY_RUNS_DIR',str(Path(tempfile.gettempdir())/'fly-runs')))
        log.mkdir(exist_ok=True)
        with (log/'moves.jsonl').open('a') as f:
            f.write(json.dumps({'game':turn.game,'position':turn.position,**result})+'\n')
        return result
    except ValueError as e:
        raise HTTPException(503,str(e)) from e
    finally:
        lock.release()

@app.get('/api/brain/geometry')
def geometry():
    if state['status']!='ready':
        raise HTTPException(503,state['message'])
    return brain.geometry

@app.post('/api/brain/play')
def play(turn:Turn):
    """Stream measured cell spikes as the trial advances, then its selected move."""
    import queue
    import time
    from fastapi.responses import StreamingResponse
    try:
        validate_chess(turn.position) if turn.game=='chess' else validate_ttt(turn.position)
    except ValueError as e:
        raise HTTPException(422,str(e)) from e
    if state['status']!='ready':
        raise HTTPException(503,state['message'])
    if not lock.acquire(blocking=False):
        raise HTTPException(429,'The fly is responding to another move. Try again shortly.')
    events=queue.Queue()
    cancelled=threading.Event()
    def activity(event):
        if cancelled.is_set():
            raise InterruptedError('Client disconnected')
        events.put(event)
        # Deliberate display pacing: 10 ms of neural time per ~100 ms wall time.
        # Brain.respond excludes callback time from compute_seconds.
        time.sleep(.08)
    def work():
        try:
            result=brain.respond(turn.game,turn.position,on_activity=activity)
            log=Path(os.environ.get('FLY_RUNS_DIR',str(Path(tempfile.gettempdir())/'fly-runs')))
            log.mkdir(exist_ok=True)
            with (log/'moves.jsonl').open('a') as f:
                f.write(json.dumps({'game':turn.game,'position':turn.position,**result})+'\n')
            events.put({'type':'result',**result})
        except InterruptedError:
            pass
        except ValueError as error:
            events.put({'type':'error','message':str(error)})
        except Exception:
            logging.exception('Streamed neural move failed')
            events.put({'type':'error','message':'The neural simulation could not finish. Try again.'})
        finally:
            lock.release()
            events.put(None)
    async def stream():
        try:
            while True:
                event=await asyncio.to_thread(events.get)
                if event is None:break
                yield json.dumps(event,separators=(',',':'))+'\n'
        finally:
            cancelled.set()
    threading.Thread(target=work,daemon=True).start()
    return StreamingResponse(stream(),media_type='application/x-ndjson',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})
