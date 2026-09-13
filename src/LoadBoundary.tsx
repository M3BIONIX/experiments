import {Button} from './UI';
import {Component, type ReactNode} from 'react';
/** A failed lazy bundle must not blank the experiment page. */
export class LoadBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="load-error" role="alert"><p>This view could not load. Check your connection and reload.</p><Button variant="outline" pressScale={0.98} onClick={()=>location.reload()}>Reload view</Button><a href="/">All experiments</a></div>:this.props.children;}
}
