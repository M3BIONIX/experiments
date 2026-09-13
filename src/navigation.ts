import {useEffect,useState} from 'react';
function currentPath(){
 const legacy=location.hash;
 if(legacy.startsWith('#/')){
  let path=legacy.slice(1);
  if(path.startsWith('/experiments/'))path=path.replace('/experiments/','/');
  else if(path==='/fly-chess'||path==='/fly-tic-tac-toe')path+='/play';
  history.replaceState(null,'',path+location.search);
 }
 return location.pathname.replace(/\/$/,'')||'/';
}
export function usePath(){
 const [path,setPath]=useState(currentPath);
 useEffect(()=>{
  const update=()=>setPath(currentPath());
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element).closest('a');
   if(!link||link.hasAttribute('download')||link.target)return;
   const url=new URL(link.href,location.href);
   if(url.origin!==location.origin||url.hash||/\.[a-z0-9]+$/i.test(url.pathname))return;
   event.preventDefault();history.pushState(null,'',url.pathname+url.search);update();window.scrollTo(0,0);
  };
  addEventListener('popstate',update);addEventListener('hashchange',update);document.addEventListener('click',click);
  return()=>{removeEventListener('popstate',update);removeEventListener('hashchange',update);document.removeEventListener('click',click);};
 },[]);
 return path;
}
