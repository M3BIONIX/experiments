import {RangeSlider,LoadingIndicator} from './UI';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './components/motion/select';
import {Button} from './UI';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeftIcon, DownloadIcon, PlayIcon, PauseIcon} from '@radix-ui/react-icons';
import {LogoResults,logoNames} from './LogoResults';
import {useReveals} from './useReveals';
import './article.css';
import './logo.css';
const root='/reports/neural-logo/';
type RecordData={order:string[];first_entry:string|null;stop_reason:string;trace:{t:number;position_mm:number[]}[];neural_trace:{pam11_hz:number;total_spikes:number;motor_hz:number;turn_hz:number}[]};
export function LogoReplay(){
 useReveals('logo-replay');
 const [seed,setSeed]=useState(1),[attempt,setAttempt]=useState(0),[record,setRecord]=useState<RecordData|null>(null),[error,setError]=useState(''),[step,setStep]=useState(0),[playing,setPlaying]=useState(false);
 const [dark,setDark]=useState(matchMedia('(prefers-color-scheme:dark)').matches);
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{document.title='Fly Logo recordings | M3BIONIX';const media=matchMedia('(prefers-color-scheme:dark)');const change=()=>setDark(media.matches);media.addEventListener('change',change);return()=>{media.removeEventListener('change',change);document.title='Experiments of M3BIONIX';};},[]);
 useEffect(()=>{let current=true;const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),15000);setPlaying(false);setRecord(null);setStep(0);setError('');fetch(`${root}trial-${String(seed).padStart(3,'0')}.json`,{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('The recording could not load.');return r.json();}).then(data=>{if(current)setRecord(data);}).catch(()=>{if(current)setError('The recording could not load. Please retry.');}).finally(()=>clearTimeout(timer));return()=>{current=false;clearTimeout(timer);abort.abort();};},[seed,attempt]);
 useEffect(()=>{if(!playing||!record)return;let frame:number,last=0;const tick=(time:number)=>{if(time-last>=40){last=time;setStep(s=>Math.min(s+1,record.trace.length-1));}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,record]);
 useEffect(()=>{if(record&&step>=record.trace.length-1)setPlaying(false);},[step,record]);
 useEffect(()=>{
  if(!record||!canvas.current)return;const g=canvas.current.getContext('2d');if(!g)return;
  const ink=dark?'#ddd':'#303030',line=dark?'#484848':'#d5d5d5',paper=dark?'#1c1c1c':'#f4f4f4';g.fillStyle=paper;g.fillRect(0,0,650,650);
  const xy=(p:number[])=>[325+p[0]*17,325-p[1]*17];g.strokeStyle=line;g.lineWidth=1;g.beginPath();g.arc(325,325,272,0,2*Math.PI);g.stroke();
  record.order.forEach((name,i)=>{const [x,y]=xy([[10,0],[0,10],[-10,0],[0,-10]][i]);g.setLineDash([4,5]);g.beginPath();g.arc(x,y,51,0,2*Math.PI);g.stroke();g.setLineDash([]);g.fillStyle=ink;g.font='700 16px Satoshi, sans-serif';g.textAlign='center';g.fillText(logoNames[name]||name,x,y+5);});
  g.strokeStyle=ink;g.lineWidth=2;g.beginPath();record.trace.slice(0,step+1).forEach((t,i)=>{const [x,y]=xy(t.position_mm);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.stroke();const [x,y]=xy(record.trace[step].position_mm);g.fillStyle=ink;g.beginPath();g.arc(x,y,6,0,2*Math.PI);g.fill();
 },[record,step,dark]);
 const t=record?.trace[step],n=record?.neural_trace[step];
 const toggle=()=>{if(record&&step===record.trace.length-1)setStep(0);setPlaying(v=>!v);};
 return <div className="article-page replay-page"><header className="article-bar"><div className="article-home brand-home"><a aria-label="About Fly Logo" href="/fly-logo"><ArrowLeftIcon aria-hidden="true"/><span>Fly Logo</span></a><span className="brand-credit">of <a href="https://m3bionix.com/">M3BIONIX</a></span></div><a className="replay-download" href={root+'summary.json'} download>Download results <DownloadIcon aria-hidden="true"/></a></header>
 <main><header className="replay-intro reveal"><h1>Fly Logo recordings</h1><p>Watch where the simulated fly went and the brain signals recorded along the way.</p></header>
 <div className="replay-layout"><section aria-labelledby="replay-title"><div className="replay-toolbar"><h2 id="replay-title">Recorded trial</h2><div className="trial-field"><Select className="trial-select" value={String(seed)} onValueChange={v=>setSeed(Number(v))}><SelectTrigger><span className="sr-only">Trial </span><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:100},(_,i)=><SelectItem key={i+1} value={String(i+1)}>{`${String(i+1).padStart(3,'0')} / 100`}</SelectItem>)}</SelectContent></Select></div></div>
 <div className="replay-canvas" aria-busy={!record&&!error}>{record?<canvas ref={canvas} width="650" height="650" role="img" aria-label={`Trial ${seed}: recorded thorax path at ${t?.t.toFixed(2)} simulated seconds`}/>:<div id={error?'load-error':undefined} className="replay-placeholder" role={error?'alert':'status'}>{error||<LoadingIndicator>Loading recording…</LoadingIndicator>}{error&&<Button variant="outline" pressScale={0.98} id="retry" onClick={()=>setAttempt(a=>a+1)}>Retry recording</Button>}</div>}</div>
 <div className="replay-transport"><Button variant="outline" pressScale={0.98} id="play" className="replay-play" disabled={!record} onClick={toggle}>{playing?<PauseIcon aria-hidden="true"/>:<PlayIcon aria-hidden="true"/>}{playing?'Pause':'Play recording'}</Button><span>{t?`${t.t.toFixed(2)} / ${record!.trace.at(-1)!.t.toFixed(2)} s`:'0.00 s'}</span><span>½ speed</span></div>
 <RangeSlider className="replay-scrub" aria-label="Recorded timestep" showTicks={false} min={0} max={Math.max(1,(record?.trace.length||1)-1)} value={step} disabled={!record} onValueChange={value=>{setPlaying(false);setStep(value);}} formatValueText={value=>`${record?.trace[value]?.t.toFixed(2)??'0'} simulated seconds`}/>
 <p className="replay-caption">The dot shows the recorded position of the fly’s body. Entering a dashed circle counted as approaching that logo. Playback does not run a new simulation.</p></section>
 <aside className="replay-signals"><h2>At this moment</h2><p>Each step shows one fiftieth of a second of the recording.</p><dl>{[['Pulses across the simulated brain',n?.total_spikes.toLocaleString()],['Monitored cells: pulses per cell / second',n?`${n.pam11_hz.toFixed(2)}`:null]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Not loaded'}</dd></div>)}</dl>
 <div className="replay-outcome"><h2>Trial outcome</h2><p>{record?(record.first_entry?`First approach: ${logoNames[record.first_entry]}`:'No logo approached.'): 'Loading outcome…'}</p><p>{record?.stop_reason}</p></div>
 <p className="replay-caption">The monitored cells are a group of 15 simulated brain cells named PAM11. These numbers do not measure how much the fly likes a logo.</p>{record&&<a id="download" className="replay-download" href={`${root}trial-${String(seed).padStart(3,'0')}.json`} download>Download this trial <DownloadIcon aria-hidden="true"/></a>}
 </aside></div>
 <LogoResults/>
 <section className="replay-method"><h2>About these recordings</h2><p>The fly’s simulated brain supplied signals to the walking program. The logos changed places between trials. No reward was given. These recordings show what happened in this initial test; they do not show that a fly became addicted to a logo.</p><div><a href={root+'protocol.json'}>How the test was set up</a><a href={root+'verification.json'}>Checks on the results</a><a href={root+'report.md'}>Written report</a><a href={root+'results.png'}>Original chart</a></div></section>
 </main><footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments">GitHub</a></footer></div>
}
