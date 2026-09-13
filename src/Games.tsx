import {LoadingIndicator} from './UI';
import {Button,Disclosure} from './UI';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import './games.css';
import { useReveals } from './useReveals';

import {LoadBoundary} from './LoadBoundary';
import type { SpikeFrame } from './BrainScene';
const BrainScene=lazy(()=>import('./BrainScene').then(m=>({default:m.BrainScene})));

type Game = 'chess' | 'tic-tac-toe';
type Telemetry = {total_spikes:number;output_spikes:number;compute_seconds:number;simulated_ms:number;tied_moves:number;selected_score:number;input_sha256:string;spike_sha256:string;output_neurons:number};
const names:Record<string,string>={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tttResult(s:string){for(const [a,b,c] of lines)if(s[a]!=='.'&&s[a]===s[b]&&s[b]===s[c])return s[a];return s.includes('.')?null:'draw';}
function chessResult(b:Chess){return b.isCheckmate()?(b.turn()==='w'?'The fly wins.':'You win.'):b.isDraw()?'A draw.':null;}

export function Games({game}:{game:Game}){
  useReveals(game);
  const board=useRef(new Chess());
  const [fen,setFen]=useState(board.current.fen());
  const [cells,setCells]=useState('.........');
  const [selected,setSelected]=useState<Square|null>(null);
  const [promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
  const [phase,setPhase]=useState<'human'|'fly'|'done'>('human');
  const [status,setStatus]=useState('loading');
  const [error,setError]=useState('');
  const [result,setResult]=useState<string|null>(null);
  const [spikeFrame,setSpikeFrame]=useState<SpikeFrame|null>(null);
  const [telemetry,setTelemetry]=useState<Telemetry|null>(null);
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{if(phase!=='fly'||error){setElapsed(0);return;}const start=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[phase,error]);
  const [history,setHistory]=useState<string[]>([]);
  const [retryPosition,setRetryPosition]=useState<string|null>(null);
  const request=useRef<AbortController|null>(null);
  const generation=useRef(0);
  const statusInFlight=useRef(false);
  const checkStatus=async()=>{
    if(statusInFlight.current)return;
    statusInFlight.current=true;
    try{const r=await fetch('/api/brain/status',{signal:AbortSignal.timeout(40000)});if(!r.ok)throw Error();const data=await r.json();setStatus(data.status);}
    catch{setStatus('unavailable');}
    finally{statusInFlight.current=false;}
  };
  useEffect(()=>{void checkStatus();return()=>{generation.current++;request.current?.abort();};},[]);
  useEffect(()=>{if(status!=='loading')return;const id=setInterval(()=>void checkStatus(),3000);return()=>clearInterval(id);},[status]);
  async function askFly(position:string){
    const id=++generation.current;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setPhase('fly');setError('');setSpikeFrame(null);setRetryPosition(position);
    const timeout=setTimeout(()=>controller.abort('timeout'),75000);
    try{
      let response:Response;
      for(let attempt=0;;attempt++){
      response=await fetch('/api/brain/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,position}),signal:controller.signal});
      if(response.status!==429||attempt>=8)break;
      await response.body?.cancel();
      await new Promise<void>((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',cancel);resolve();},750);if(controller.signal.aborted)cancel();else controller.signal.addEventListener('abort',cancel,{once:true});});
      }
      if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.detail||'The neural simulator could not respond. Try again.');}
      if(!response.body)throw Error('The neural stream is unavailable.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let data:any=null;
      while(true){
        const {done,value}=await reader.read();if(done)break;
        pending+=decoder.decode(value,{stream:true});
        let newline;
        while((newline=pending.indexOf('\n'))>=0){
          const line=pending.slice(0,newline);pending=pending.slice(newline+1);if(!line)continue;
          const event=JSON.parse(line);if(id!==generation.current){await reader.cancel();return;}
          if(event.type==='activity')setSpikeFrame(event as SpikeFrame);
          else if(event.type==='result')data=event;
          else if(event.type==='error')throw Error(event.message);
        }
      }
      if(id!==generation.current)return;
      if(!data)throw Error('The neural stream ended before a move was selected.');
      if(game==='chess'){
        const move=board.current.move(data.move);if(!move)throw Error('The server returned an illegal move.');
        setFen(board.current.fen());setHistory(board.current.history());const end=chessResult(board.current);setResult(end);setPhase(end?'done':'human');
      }else{
        const i=Number(data.move);if(!Number.isInteger(i)||i<0||i>8||position[i]!=='.')throw Error('The server returned an illegal move.');
        const next=position.slice(0,i)+'O'+position.slice(i+1);setCells(next);const end=tttResult(next);setResult(end==='O'?'The fly wins.':end==='draw'?'A draw.':null);setPhase(end?'done':'human');
      }
      setTelemetry(data.telemetry);setRetryPosition(null);
    }catch(e){if(id!==generation.current)return;setError(controller.signal.aborted?'The response took too long. Retry this move.':e instanceof Error?e.message:'The neural simulator could not respond.');}
    finally{clearTimeout(timeout);}
  }
  function humanChess(from:Square,to:Square,promote?:string){
    const move=board.current.move({from,to,...(promote?{promotion:promote}:{})});if(!move)return;
    setFen(board.current.fen());setHistory(board.current.history());setSelected(null);setPromotion(null);setTelemetry(null);
    const end=chessResult(board.current);setResult(end);if(end){setPhase('done');return;}void askFly(board.current.fen());
  }
  function chooseSquare(square:Square){
    if(phase!=='human'||status!=='ready'||promotion)return;
    const piece=board.current.get(square);
    if(piece?.color==='w'){setSelected(selected===square?null:square);return;}
    if(selected){const moves=board.current.moves({square:selected,verbose:true}).filter(m=>m.to===square);
      if(moves.length){if(moves.some(m=>m.promotion)){setPromotion({from:selected,to:square});return;}humanChess(selected,square);}}
  }
  function humanTtt(i:number){
    if(phase!=='human'||cells[i]!=='.'||status!=='ready')return;
    const next=cells.slice(0,i)+'X'+cells.slice(i+1);setCells(next);setTelemetry(null);const end=tttResult(next);
    if(end){setResult(end==='X'?'You win.':'A draw.');setPhase('done');return;}void askFly(next);
  }
  function reset(){generation.current++;request.current?.abort();board.current=new Chess();setFen(board.current.fen());setCells('.........');setSelected(null);setPromotion(null);setPhase('human');setResult(null);setError('');setTelemetry(null);setSpikeFrame(null);setHistory([]);setRetryPosition(null);}
  const lastMove=board.current.history({verbose:true}).at(-1);
  const legal=selected?board.current.moves({square:selected,verbose:true}).map(m=>m.to):[];
  const message=result||(error?'The fly could not respond.':status!=='ready'?(status==='loading'?'Loading the fly neural simulation…':'The neural simulator is offline.'):phase==='fly'?`The fly is responding${elapsed>=3?` · ${elapsed}s`: '…'}`:game==='chess'?(board.current.isCheck()?'You’re in check.':'Your turn. You play White.'):'Your turn. You play X.');
  return <div className="game-page">
    <a className="back-link" href={`#/experiments/${game === 'chess' ? 'fly-chess' : 'fly-tic-tac-toe'}`}><ArrowLeftIcon aria-hidden="true"/> About this experiment</a>
    <header className="game-intro"><div className="game-title reveal"><h1>{game==='chess'?'Fly Chess':'Fly Tic Tac Toe'}</h1><p>{game==='chess'?'You play White. Select a piece, then a square.':'You play X. Choose an empty square.'}</p></div></header>
    {game==='chess'&&<p className="game-limitation">Current result: the untrained readout frequently repeats moves. <a href="#/experiments/fly-chess/evaluation">Behavioral evaluation</a></p>}
    <main className="play-layout">
      <section className="board-section reveal" aria-label="Game board">
        <div className="player-bar"><span className="player-token black-token"/><div><strong>Fly brain</strong><span>Simulated opponent</span></div><span className="turn-label">{phase==='fly'&&!error?'Responding':game==='chess'?'Black':'O'}</span></div>
        {game==='chess'?<div className="chessboard" aria-label="Chess board" data-fen={fen}>{Array.from({length:64},(_,i)=>{
          const row=Math.floor(i/8),col=i%8,square=(String.fromCharCode(97+col)+(8-row)) as Square;
          const piece=board.current.get(square);return <Button variant="ghost" pressScale={1} key={square} whileHover={undefined} className={`h-auto w-full square ${(row+col)%2?'dark-square':'light-square'} ${selected===square?'selected':''} ${legal.includes(square)?'legal':''} ${piece?'occupied':''} ${lastMove&&(lastMove.from===square||lastMove.to===square)?'last-move':''} ${piece?.type==='k'&&piece.color===board.current.turn()&&board.current.isCheck()?'in-check':''}`} onClick={()=>chooseSquare(square)} disabled={phase!=='human'||status!=='ready'||!!promotion} aria-label={`${square}${piece?` ${piece.color==='w'?'white':'black'} ${names[piece.type]}`:' empty'}${legal.includes(square)?', legal move':''}`} aria-pressed={selected===square}>
          {row===7&&<span className="file" aria-hidden="true">{String.fromCharCode(97+col)}</span>}{col===0&&<span className="rank" aria-hidden="true">{8-row}</span>}<span className="piece" aria-hidden="true">{piece&&<img src={`/pieces/${piece.color}${piece.type.toUpperCase()}.svg`} alt="" draggable="false"/>}</span>
          </Button>;
        })}</div>:<div className="ttt-board" aria-label="Tic tac toe board">{cells.split('').map((cell,i)=><Button variant="ghost" pressScale={1} whileHover={undefined} className="h-auto w-full ttt-cell" key={i} disabled={phase!=='human'||status!=='ready'||cell!=='.'} onClick={()=>humanTtt(i)} aria-label={`Row ${Math.floor(i/3)+1}, column ${i%3+1}, ${cell==='.'?'empty':cell}`}>{cell==='.'?'':cell}</Button>)}</div>}
        <div className="player-bar human-bar"><span className="player-token white-token"/><div><strong>You</strong><span>{game==='chess'?'White pieces':'Crosses'}</span></div><div className="game-status" role="status" aria-live="polite">{message}</div></div>
        {promotion&&<div className="promotion" role="group" aria-label="Choose promotion"><span>Promote to</span>{['q','r','b','n'].map(p=><Button variant="outline" pressScale={0.98} key={p} onClick={()=>humanChess(promotion.from,promotion.to,p)}>{names[p]}</Button>)}<Button variant="outline" pressScale={0.98} onClick={()=>setPromotion(null)}>Cancel</Button></div>}
        <div className="game-actions"><Button variant="outline" pressScale={0.98} onClick={reset}>New game</Button><a href={`/pieces/NOTICE.txt`} target="_blank">{game==='chess'?'Piece credits':''}</a></div>
        {error&&<div className="game-error" role="alert"><p>{error}</p><Button variant="outline" pressScale={0.98} onClick={()=>retryPosition&&void askFly(retryPosition)}>Retry fly move</Button></div>}
        {status==='unavailable'&&<div className="game-error"><p>The brain service is unavailable. Please try connecting again shortly.</p><Button variant="outline" pressScale={0.98} onClick={()=>void checkStatus()}>Check connection</Button></div>}
      </section>
      <div className="brain-region"><LoadBoundary><Suspense fallback={<div className="brain-placeholder" role="status"><LoadingIndicator>Loading neuron view…</LoadingIndicator></div>}><BrainScene frame={spikeFrame} running={phase==='fly'&&!error} ready={status==='ready'} /></Suspense></LoadBoundary></div>
      <aside className="game-notes reveal">
        <Disclosure className="brain-details" title={<>How the fly chooses</>}><p>MaleCNS v1.0, using the neural backend from <a href="https://github.com/mattyhempstead/fly-wirehead" target="_blank" rel="noopener noreferrer">Fly / Wirehead</a>. Each turn starts from the same neural state, with learning disabled.</p><p>We divide annotated descending neurons into 64 fixed groups. Tic tac toe uses one group per cell. Chess scores the destination group plus one quarter of the origin group. Equal scores, including zero scores, use a fixed order. No chess engine chooses the fly’s move.</p><a href="https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/" target="_blank" rel="noopener noreferrer">Read about the connectome</a></Disclosure>
        {telemetry&&<Disclosure className="neural-reading" title={<>Last response measurements</>}><dl><div><dt>Network spikes</dt><dd>{telemetry.total_spikes.toLocaleString()}</dd></div><div><dt>Output spikes</dt><dd>{telemetry.output_spikes.toLocaleString()}</dd></div><div><dt>Simulated time</dt><dd>{telemetry.simulated_ms} ms</dd></div><div><dt>Compute time</dt><dd>{telemetry.compute_seconds} s</dd></div></dl>{telemetry.tied_moves>1&&<p>{telemetry.tied_moves} moves tied{telemetry.selected_score===0?' at zero activity':''}. Fixed ordering resolved the tie.</p>}<Disclosure title={<>Measurement hashes</>}><p>Input: <code>{telemetry.input_sha256}</code></p><p>Spikes: <code>{telemetry.spike_sha256}</code></p></Disclosure></Disclosure>}
        {game==='chess'&&history.length>0&&<div className="move-history"><h2>Moves</h2><ol>{Array.from({length:Math.ceil(history.length/2)},(_,i)=><li key={i}><span>{history[2*i]}</span><span>{history[2*i+1]||''}</span></li>)}</ol></div>}
      </aside>
    </main><footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments">GitHub</a></footer>
  </div>;
}
