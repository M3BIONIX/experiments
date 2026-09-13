import {LoadingIndicator} from './UI';
import React from 'react';
import {LoadBoundary} from './LoadBoundary';
import { createRoot } from 'react-dom/client';
import {BouncyAccordion} from './components/motion/bouncy-accordion';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import './style.css';
import {usePath} from './navigation';
const Games = React.lazy(() => import('./Games').then(module => ({ default: module.Games })));
import { useReveals } from './useReveals';
import { ExperimentArticle, articles } from './ExperimentArticle';

const experiments = [
  {id:'fly-logo',title:'Fly Logo',description:'We tested app logos with virtual food, walking costs, and entry penalties. See what the simulated fly did.',href:'/fly-logo'},
  { id: 'sneak-bench', title: 'Sneak Bench', description: 'AI models play therapist, trying to identify the model on the other side of the conversation. Explore the conversations and results.', href: 'https://sneakbench.m3bionix.com/' },
  { id: 'fly-chess', title: 'Fly Chess', description: 'Play White against a fly-connectome simulation and watch its measured neural response.', href: '/fly-chess/play' },
  { id: 'fly-tic-tac-toe', title: 'Fly Tic Tac Toe', description: 'Play X against the fly network on a nine-cell board.', href: '/fly-tic-tac-toe/play' },
];

function Index() {
  useReveals('index');
  return (
    <div className="page">
      <main id="main">
          <header className="intro reveal">
          <h1>Experiments <span>of <a href="https://m3bionix.com/">M3BIONIX</a></span></h1>
          <p>A few things I’m curious enough to build.</p>
        </header>
        <BouncyAccordion className="experiments beui-index reveal" classNames={{item:'experiment',trigger:'experiment-trigger',title:'experiment-title',content:'experiment-content',description:'description'}} items={experiments.map(experiment=>({id:experiment.id,title:<span role="heading" aria-level={2}>{experiment.title}</span>,description:<div className="description"><p>{experiment.description}</p><a className="visit" href={`/${experiment.id}`}>About the experiment <ArrowTopRightIcon aria-hidden="true"/></a></div>}))}/>

      </main>
      <footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments" target="_blank" rel="noopener noreferrer">GitHub <ArrowTopRightIcon aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></footer>
    </div>
  );
}
function App() {
  const path=usePath();
  const [,id,section]=path.split('/');
  if(articles[id]&&section!=='play')return <ExperimentArticle key={id} id={id} section={section}/>;
  if (path === '/fly-chess/play') return <LoadBoundary><React.Suspense fallback={<div className="game-loading" role="status"><LoadingIndicator>Loading Fly Chess…</LoadingIndicator><div className="loading-board"/></div>}><Games key="chess" game="chess" /></React.Suspense></LoadBoundary>;
  if (path === '/fly-tic-tac-toe/play') return <LoadBoundary><React.Suspense fallback={<div className="game-loading" role="status"><LoadingIndicator>Loading Fly Tic Tac Toe…</LoadingIndicator><div className="loading-board"/></div>}><Games key="tic-tac-toe" game="tic-tac-toe" /></React.Suspense></LoadBoundary>;
  return <Index />;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

// Keyboard navigation is immediate; pointer feedback stays subtle.
document.addEventListener('keydown', () => document.documentElement.setAttribute('data-keyboard', ''));
document.addEventListener('pointerdown', () => document.documentElement.removeAttribute('data-keyboard'));
