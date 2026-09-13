import {LoadingIndicator} from './UI';
import {Button,Disclosure} from './UI';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './brain-scene.css';

export type SpikeFrame={type:'activity';end_ms:number;indices:number[];counts:number[];total_spikes:number;mapped_spikes:number};
type Geometry={positions:number[];indices:number[];count:number;total:number};
let geometryRequest:Promise<Geometry>|null=null;
function loadGeometry(){
  geometryRequest??=fetch('/api/brain/geometry',{signal:AbortSignal.timeout(45000)}).then(async response=>{
    if(!response.ok)throw Error('Could not load neuron coordinates.');return response.json() as Promise<Geometry>;
  }).catch(error=>{geometryRequest=null;throw error;});
  return geometryRequest;
}

export function BrainScene({frame,running,ready}:{frame:SpikeFrame|null;running:boolean;ready:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const apply=useRef<((frame:SpikeFrame|null)=>void)|null>(null);
  const command=useRef<(action:string)=>void>(()=>{});
  const latest=useRef(frame);latest.current=frame;
  const [geometry,setGeometry]=useState<Geometry|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!ready)return;
    let current=true;setError('');
    loadGeometry().then(data=>{if(current)setGeometry(data);}).catch(error=>{if(current)setError(error instanceof Error?error.message:'Could not load neuron positions.');});
    return()=>{current=false;};
  },[ready,attempt]);
  useEffect(()=>{
    if(!geometry||!host.current)return;
    const container=host.current;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setError('3D rendering is unavailable in this browser. Game spike counts are still available.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.domElement.setAttribute('aria-label','Interactive 3D MaleCNS neuron positions. Drag to rotate, or use the buttons below.');
    renderer.domElement.setAttribute('role','img');
    container.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const positions=new Float32Array(geometry.positions.length);
    for(let i=0;i<positions.length;i+=3){positions[i]=geometry.positions[i];positions[i+1]=-geometry.positions[i+2];positions[i+2]=geometry.positions[i+1];}
    const buffer=new THREE.BufferGeometry();buffer.setAttribute('position',new THREE.BufferAttribute(positions,3));buffer.computeBoundingBox();
    const center=buffer.boundingBox!.getCenter(new THREE.Vector3());const extent=buffer.boundingBox!.getSize(new THREE.Vector3());const scale=240/Math.max(extent.x,extent.y,extent.z);
    for(let i=0;i<positions.length;i+=3){positions[i]=(positions[i]-center.x)*scale;positions[i+1]=(positions[i+1]-center.y)*scale;positions[i+2]=(positions[i+2]-center.z)*scale;}
    buffer.attributes.position.needsUpdate=true;buffer.computeBoundingSphere();
    const activation=new Float32Array(geometry.count);buffer.setAttribute('activation',new THREE.BufferAttribute(activation,1));
    const theme=window.matchMedia('(prefers-color-scheme: dark)');
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{dark:{value:theme.matches?1:0},pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`
      attribute float activation; varying float fired; uniform float pixelRatio;
      void main(){fired=activation;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=(activation>0.0?3.8:1.25)*pixelRatio;}
    `,fragmentShader:`
      varying float fired;uniform float dark;
      void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;
      vec3 resting=mix(vec3(.20,.38,.43),vec3(.35,.62,.68),dark);
      vec3 firingColor=mix(vec3(.67,.22,.04),vec3(1.,.71,.30),dark);
      gl_FragColor=vec4(fired>0.0?firingColor:resting,fired>0.0?.95:mix(.12,.22,dark));}
    `});
    scene.add(new THREE.Points(buffer,material));
    const camera=new THREE.PerspectiveCamera(38,1,1,2000);camera.position.set(0,0,420);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=false;
    renderer.domElement.style.touchAction='pan-y';
    const render=()=>renderer.render(scene,camera);controls.addEventListener('change',render);
    const resize=new ResizeObserver(()=>{const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();const fov=THREE.MathUtils.degToRad(camera.fov);const distance=buffer.boundingSphere!.radius/Math.sin(Math.min(fov,2*Math.atan(Math.tan(fov/2)*camera.aspect))/2)*1.08;camera.position.setLength(distance);controls.update();render();});resize.observe(container);
    const recolor=()=>{material.uniforms.dark.value=theme.matches?1:0;render();};theme.addEventListener('change',recolor);
    apply.current=(value)=>{activation.fill(0);if(value)for(let i=0;i<value.indices.length;i++){const index=value.indices[i];if(index<activation.length)activation[index]=value.counts[i];}buffer.attributes.activation.needsUpdate=true;render();};
    apply.current(latest.current);
    command.current=action=>{if(action==='reset'){camera.position.set(0,0,420);controls.target.set(0,0,0);}else if(action==='left'||action==='right'){camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?-.25:.25);}else{camera.position.multiplyScalar(action==='in'?.85:1.15);camera.position.clampLength(180,800);}controls.update();render();};
    const lost=(event:Event)=>{event.preventDefault();setError('The 3D context was interrupted. Reload the view to continue.');};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{apply.current=null;command.current=()=>{};resize.disconnect();theme.removeEventListener('change',recolor);controls.dispose();buffer.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();};
  },[geometry,attempt]);
  useEffect(()=>{apply.current?.(frame);},[frame]);
  return <section className="brain-scene" aria-labelledby="brain-scene-title">
    <div className="brain-scene-heading"><h2 id="brain-scene-title">The fly’s nervous system</h2><span>{running?'Receiving spikes':frame?'Last measured interval':'Waiting for your move'}</span></div>
    <p className="brain-anatomy">Brain above, nerve cord below. Dots are recorded cell-body positions; the space between them is not a missing image. Orange dots fired during the displayed interval.</p>
    <div className="brain-canvas" ref={host}>{!geometry&&!error&&<p>{ready?<LoadingIndicator>Loading neuron positions…</LoadingIndicator>:'Waiting for the neural simulator…'}</p>}</div>
    {error&&<div className="brain-error" role="alert">{error}<Button variant="outline" pressScale={0.98} onClick={()=>setAttempt(v=>v+1)}>Reload 3D view</Button></div>}
    <Disclosure className="brain-options" title={<>Rotate, zoom & model details</>}>
    <div className="brain-controls" aria-label="3D view controls"><Button variant="outline" pressScale={0.98} onClick={()=>command.current('left')} aria-label="Rotate brain left">Rotate left</Button><Button variant="outline" pressScale={0.98} onClick={()=>command.current('right')} aria-label="Rotate brain right">Rotate right</Button><Button variant="outline" pressScale={0.98} onClick={()=>command.current('in')} aria-label="Zoom brain in">+</Button><Button variant="outline" pressScale={0.98} onClick={()=>command.current('out')} aria-label="Zoom brain out">−</Button><Button variant="outline" pressScale={0.98} onClick={()=>command.current('reset')}>Reset view</Button></div>

    <p className="brain-key"><span className="rest-key"/>Neuron position <span className="fire-key"/>Fired in this interval</p>
    <p className="brain-caption">{geometry?`${geometry.count.toLocaleString()} of ${geometry.total.toLocaleString()} neurons have recorded cell-body positions.`:'Reconstructed MaleCNS cell-body positions.'} Measured 10 ms intervals arrive as the model runs, slowed for visibility. This shows cell bodies, not full branching neuron shapes.</p></Disclosure>
    <div className="brain-bin"><strong>{frame?`${frame.end_ms-10}-${frame.end_ms} ms`:'No spikes measured yet'}</strong><span>{frame?`${frame.total_spikes.toLocaleString()} network spikes`: 'Make a move to start a trial.'}</span></div>
  </section>;
}
