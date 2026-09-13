import {RangeSlider,LoadingIndicator} from './UI';
import {Button} from './UI';
import { useEffect, useState } from 'react';
import { ReloadIcon } from '@radix-ui/react-icons';
import './neural.css';
import { useBlurChange } from './useReveals';

type Activity = {total_spikes:number;output_spikes:number;output_neurons:number;simulated_ms:number;activity_bins:{end_ms:number;rates_hz:number[]}[]};
type Game = 'chess' | 'tic-tac-toe';
const requests = new Map<Game,Promise<Activity>>();
function measure(game:Game, fresh=false) {
  if(fresh) requests.delete(game);
  if(!requests.has(game)) requests.set(game,fetch('/api/brain/move',{
    signal:AbortSignal.timeout(45000),method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({game,position:game==='chess'?'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1':'....X....'})
  }).then(async response=>{
    if(!response.ok) throw Error('The neural simulator is unavailable or busy. Try again shortly.');
    const data=await response.json();
    if(!Array.isArray(data.telemetry?.activity_bins)||data.telemetry.activity_bins.length!==10)throw Error('This display needs the updated neural backend.');
    return data.telemetry as Activity;
  }).catch(error=>{requests.delete(game);throw error;}));
  return requests.get(game)!;
}
export function NeuralActivity({game}:{game:Game}) {
  const [activity,setActivity]=useState<Activity|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [trial,setTrial]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  useEffect(()=>{
    if(trial===0)return;
    let current=true;setLoading(true);setError('');
    measure(game,trial>0).then(data=>{if(current){setActivity(data);setSelected(null);}}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[game,trial]);
  useBlurChange('.neural-chart',`${game}/${trial}/${loading}/${error}`);
  const peak=Math.max(1,...(activity?.activity_bins.flatMap(bin=>bin.rates_hz)||[]));
  const selectedBin=selected===null?null:activity?.activity_bins[selected];
  return <figure className="neural-panel reveal" aria-labelledby="neural-title">
    <div className="neural-heading"><div><h2 id="neural-title">Inside the response</h2><p>Measured neural activity</p></div><Button variant="outline" pressScale={0.98} className="neural-refresh" onClick={()=>setTrial(n=>n+1)} disabled={loading} aria-label="Run neural sample again"><ReloadIcon aria-hidden="true"/><span>{loading?'Measuring…':activity?'Run again':'Run sample'}</span></Button></div>
    <div className="neural-chart" aria-busy={loading}>
      {activity?<svg viewBox="0 0 720 284" role="img" aria-label={`Neural firing rates in 64 descending-neuron groups over 100 milliseconds. Peak group rate ${peak.toFixed(1)} hertz.`}>
        <text x="42" y="14" className="chart-label">Neuron groups</text>
        {[1,16,32,48,64].map(group=><text key={group} x="27" y={32+(group-1)*3.4} textAnchor="end" className="chart-label">{group}</text>)}
        {activity.activity_bins.map((bin,t)=>bin.rates_hz.map((rate,g)=><rect key={`${t}-${g}`} x={42+t*66} y={24+g*3.4} width="62" height="2.8" rx=".8" className={rate>0?'neural-cell':'neural-empty'} opacity={rate>0?.22+.78*rate/peak:1}><title>Group {g+1}, {bin.end_ms-10}-{bin.end_ms} ms: {rate.toFixed(1)} Hz</title></rect>))}
        {[0,20,40,60,80,100].map(t=><text key={t} x={42+t*6.6-(t===100?4:0)} y="262" textAnchor={t===100?'end':'start'} className="chart-label tick-desktop">{t} ms</text>)}
        {[0,50,100].map(t=><text key={`mobile-${t}`} x={42+t*6.6-(t===100?4:0)} y="262" textAnchor={t===100?'end':t===50?'middle':'start'} className="chart-label tick-mobile">{t} ms</text>)}
        {selected!==null&&<rect x={40+selected*66} y="21" width="66" height="223" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2"/>}
      </svg>:<div className="neural-placeholder"><span>{error?'No measurement available.':loading?'Measuring a sample board position…':'Run a sample to inspect the neural response.'}</span></div>}
    </div>
    {activity&&<>
      <label className="neural-scrubber">Inspect time interval<RangeSlider min={0} max={9} value={selected??9} onValueChange={setSelected} aria-label="Inspect time interval" formatValueText={v=>`${v*10} to ${(v+1)*10} milliseconds`}/></label>
      <div className="neural-legend"><span>Less active <i aria-hidden="true"/> More active</span><span>0-{peak.toFixed(1)} Hz</span></div>
      <div className="neural-summary" aria-live="polite">{selectedBin?<><strong>{selectedBin.end_ms-10}-{selectedBin.end_ms} ms</strong><span>{selectedBin.rates_hz.filter(rate=>rate>0).length} of 64 groups active</span></>:<><strong>{activity.total_spikes.toLocaleString()} network spikes</strong><span>{activity.simulated_ms} ms of simulated time</span></>}</div>
    </>}
    {error&&<p className="neural-error" role="alert">{error}{activity?' The previous measurement is still shown.':''}</p>}
    <figcaption>Sample input: {game==='chess'?'the board after White plays e4':'X in the center'}. Each row is a group of descending neurons; brightness shows firing rate. This is a measured sample, not a live feed or an anatomical brain map.</figcaption>
  </figure>;
}
