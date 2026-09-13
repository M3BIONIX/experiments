import type {ReactNode} from 'react';
import {BouncyAccordion} from './components/motion/bouncy-accordion';
import {Loader} from './components/motion/loader';
export {Button,ButtonLink} from './components/motion/button/base';
export {RangeSlider} from './components/motion/range-slider';
export function Disclosure({title,children,className=''}:{title:ReactNode;children:ReactNode;className?:string}){
 return <BouncyAccordion className={`beui-disclosure ${className}`} classNames={{item:'disclosure-item',trigger:'disclosure-trigger',title:'disclosure-title',description:'disclosure-body'}} items={[{id:'details',title,description:children}]}/>;
}
export function LoadingIndicator({children}:{children:ReactNode}){return <span className="loading-indicator"><Loader variant="dots" size={22}/><span>{children}</span></span>}
