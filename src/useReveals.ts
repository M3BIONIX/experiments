import { useEffect } from 'react';

/** Replayable visual feedback, never a delay on interaction or data updates. */
export function blurIn(element:HTMLElement, subtle=false) {
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  element.getAnimations().forEach(animation=>animation.cancel());
  return element.animate([
    {opacity:subtle?.6:0,filter:`blur(${subtle?2:4}px)`,transform:`translateY(${subtle?0:8}px)`},
    {opacity:1,filter:'blur(0px)',transform:'translateY(0px)'}
  ],{duration:subtle?160:260,easing:'cubic-bezier(.23,1,.32,1)'});
}
export function useReveals(key:string) {
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches)return;
    const animations:Animation[]=[];
    const elements=Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){const animation=blurIn(entry.target as HTMLElement);if(animation)animations.push(animation);observer.unobserve(entry.target);}
    }),{threshold:.04});
    elements.forEach(element=>observer.observe(element));
    const cancel=()=>animations.forEach(animation=>animation.cancel());
    const preference=()=>{if(reduced.matches){observer.disconnect();cancel();}};
    reduced.addEventListener('change',preference);
    const resume=()=>{elements.filter(element=>{const rect=element.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;}).forEach(element=>{const animation=blurIn(element);if(animation)animations.push(animation);});};
    window.addEventListener('pageshow',resume);
    return()=>{observer.disconnect();cancel();reduced.removeEventListener('change',preference);window.removeEventListener('pageshow',resume);};
  },[key]);
}
export function useBlurChange(selector:string,key:string) {
  useEffect(()=>{
    const element=document.querySelector<HTMLElement>(selector);
    if(!element)return;
    const animation=blurIn(element,true);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancel=()=>animation?.cancel();reduced.addEventListener('change',cancel);
    return()=>{cancel();reduced.removeEventListener('change',cancel);};
  },[selector,key]);
}
