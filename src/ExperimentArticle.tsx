import {ButtonLink} from './UI';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowTopRightIcon } from '@radix-ui/react-icons';
import './article.css';
import { Banner } from './Banner';
import {CostResults} from './CostResults';
import { useReveals } from './useReveals';

type Section = { id: string; title: string; paragraphs: string[] };
type Experiment = { title: string; intro: string; tryHref: string; sections: Section[]; sources: { title: string; href: string }[] };
const flySources = [
  { title: 'Fly / Wirehead', href: 'https://github.com/mattyhempstead/fly-wirehead' },
  { title: 'Mapping the male fruit fly brain', href: 'https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/' },
  { title: 'MaleCNS dataset', href: 'https://male-cns.janelia.org/download/' },
];
const flyLimits = ['The wiring is based on a mapped fly nervous system, but the simulation makes simplifying assumptions. It starts fresh each turn and does not learn from playing.'];
const flySections = (chess:boolean):Section[] => [
 {id:'about',title:'About',paragraphs:[chess?'Play White against a simulated fruit fly nervous system. After your move, the board becomes an image. The network’s measured response selects a legal reply.':'Play X against the same fly-connectome simulation on a nine-cell board. Each mark changes the image sent to the network.']},
 {id:'why',title:'The question',paragraphs:[chess?'Can a network wired for a fly produce different actions when shown different chess positions? This experiment tests that connection between visual input, neural response, and action. It has no trained chess strategy.':'A small board makes the input-to-action connection easier to inspect. Change one cell, compare the firing pattern, and follow a complete game in a few turns.']},
 {id:'how',title:'How it works',paragraphs:['The program turns the board into an image and sends it to a simulated fly brain. It runs for one tenth of a second of simulated time, then a fixed rule converts the resulting brain signals into a move. The game allows only legal moves.',chess?'Each position reproducibly reshuffles how legal moves connect to measured brain-cell groups. This removes the old permanent square bias. It is an engineered adapter, not a learned chess strategy.':'Legal moves are assigned to measured brain-cell groups using a reproducible shuffle based on the position. The strongest assigned group selects the move. This mapping is our rule, not something the fly learned.']},
 {id:'limits',title:'Reading the activity',paragraphs:['During play, the 3D view shows where simulated brain cells sent electrical pulses. The dots mark cell locations, not their full branching shapes. Open the response details after a turn for the recorded numbers.',...flyLimits]},
];
export const articles:Record<string,Experiment>={
 'sneak-bench':{title:'Sneak Bench',intro:'Can one AI model identify another through conversation?',tryHref:'https://sneakbench.m3bionix.com/',sections:[
 {id:'about',title:'About',paragraphs:['Models take the role of a therapist and try to identify the model on the other side of a conversation.']},
 {id:'why',title:'The question',paragraphs:['Models have recurring habits: phrasing, follow-up questions, and ways of avoiding an answer. Sneak Bench asks whether another model can use those clues to recognize its conversation partner.']},
 {id:'how',title:'Explore the benchmark',paragraphs:['Open Sneak Bench to see the conversations and available results. The therapist role provides a conversational format; the task is model identification.']}
 ],sources:[{title:'Sneak Bench',href:'https://sneakbench.m3bionix.com/'}]},
 'fly-chess':{title:'Fly Chess',intro:'Play against a simulated fly nervous system.',tryHref:'/fly-chess/play',sections:[{id:'evaluation',title:'Current result',paragraphs:['The earlier square-based rule often moved a piece back and forth. The new rule changes the assignment of legal moves to measured neuron groups for each position, with no bonus for rooks or any other piece.','In three actual neural games with 30 replies each, the new adapter made zero immediate reversals and used all six piece types. Rooks made 5 of the 90 moves. The earlier evaluation recorded 62 reversals in 90 replies.','The variety comes partly from our reproducible position-based assignment. The fly has not learned chess, and these tests do not measure strategic strength or guarantee that repetition can never occur.']},...flySections(true)],sources:[...flySources,{title:'Current move-variety test: 90 actual neural replies',href:'/reports/chess/position-readout-evaluation.json'},{title:'Earlier square-based adapter evaluation',href:'/reports/chess/readout-evaluation.json'}]},
 'fly-tic-tac-toe':{title:'Fly Tic Tac Toe',intro:'Nine cells. One fly-connectome simulation.',tryHref:'/fly-tic-tac-toe/play',sections:flySections(false),sources:flySources},
 'fly-logo':{title:'Fly Logo',intro:'Does an app logo become worth coming back to?',tryHref:'/fly-logo/results',sections:[
 {id:'about',title:'Why we tried this',paragraphs:['Opening an app can bring something we want to see. I wanted to know whether its logo could become enough to trigger a reward-related brain response and make a fly choose it again.','We tested that idea in a computer model using Instagram, Google, WhatsApp, and YouTube logos. This experiment added virtual food, a cost for walking, and a penalty for entering the trained logo’s area. We wanted to see whether the fly learned a preference and kept returning when getting there had a cost.']},
 {id:'method',title:'What we did',paragraphs:['We ran 48 training conditions: four logos, each placed in four positions, under three different training rules. In one group, reaching the food near the logo produced a reward signal. A second received the same positive signal later while looking at a blank image. A third had learning switched off.','Each training run began with three short starts near food, then a chance to reach food from the centre. Starting the fly next to food gave it exposure; we did not count those guided starts as choices.','The program kept a running score: walking cost plus entry penalties, minus the benefit of virtual food. Positive outcomes sent signals to one group of brain cells; costs sent signals to another. The model could change its connections during learning, but we did not give it an optimizer that guarantees a lower score.','After training, we ran 192 walking tests with no reward signal: food removed; a further two seconds of logo viewing without reward; higher walking cost; and a penalty for entering the trained logo’s area. Each test began from the saved training and lasted up to three seconds. Cost signals remained active where the test required them.','We also showed the trained logo on its own, then a matching blank panel, for one fifth of a second each. We switched both reward and cost inputs off for these checks so we could measure the response to the picture itself.']},
 {id:'results',title:'What we observed',paragraphs:['With food removed, the fly reached its trained logo first in 4 of 16 tests in every group. Higher walking cost gave the same counts. After extra viewing without reward, the counts were 4, 4, and 3. There was no consistent lead for training that linked food to the logo.','In the entry-penalty test, the food-linked group reached its trained logo first in 2 of 16 tests; the other groups did so in 4 of 16. Two food-linked trials actually delivered a target penalty. Neither recorded a later return after the fly left the area.','Every recorded first approach was toward the east position, the direction the fly faced at the start. The logos changed places, but the starting direction did not. These choices therefore do not give us a useful ranking of the logos.','The logo-only checks recorded zero pulses in the monitored reward-related cells in all three groups. The blank-panel checks also recorded zero. We did not observe a response in that cell group to the logo alone.']},
 {id:'answer',title:'What the results mean',paragraphs:['This run did not show that the logos produced a lasting preference or that the fly kept returning despite a penalty. The strong starting-direction bias limits what the walking results can tell us about the pictures.','Zero pulses in the monitored cells do not mean the fly disliked a logo. Continued walking under higher cost could also mean that our movement controller or cost signal failed to produce useful avoidance.','The walks were short and ended at the observation boundary. A fly that never reached the penalty area tells us nothing about returning after punishment. Even for the few that did, three seconds gives little time to leave and return.','These are results from an experimental computer model. They do not establish addiction or tell us how real flies feel. A useful next test would vary the starting direction as well as logo position and allow more time for choices and returns.']}
 ],sources:[{title:'Full experiment report',href:'/reports/cost-learning/report.md'},{title:'All 192 walking tests',href:'/reports/cost-learning/probes.csv'},{title:'Method and settings',href:'/reports/cost-learning/protocol.json'},{title:'Recorded verification',href:'/reports/cost-learning/verification.json'}]},

};

export function ExperimentArticle({ id, section }: { id: string; section?: string }) {
  const experiment = articles[id];
  useReveals(`${id}/${section || ''}`);
  const [active, setActive] = useState('about');
  useEffect(() => {
    document.title = `${experiment.title} | Experiments of M3BIONIX`;
    return () => { document.title = 'Experiments of M3BIONIX'; };
  }, [experiment.title]);
  useEffect(() => {
    if (section) document.getElementById(`article-${section}`)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [id, section]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id.replace('article-', ''));
    }, { rootMargin: '-100px 0px -55% 0px' });
    document.querySelectorAll('.article-section').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [id]);
  const external = experiment.tryHref.startsWith('https:');
  return <div className="article-page">
    <header className="article-bar">
      <div className="article-home brand-home"><a href="/"><ArrowLeftIcon aria-hidden="true"/><span>Experiments</span></a><span className="brand-credit">of <a href="https://m3bionix.com/">M3BIONIX</a></span></div>
      <ButtonLink className="try-link" href={experiment.tryHref} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{id==='fly-logo'?'Explore results':`Try ${experiment.title}`}<ArrowTopRightIcon aria-hidden="true" />{external && <span className="sr-only"> (opens in a new tab)</span>}</ButtonLink>
    </header>
    <div className="article-layout">
      <nav className="article-nav" aria-label="On this page">
        {[...experiment.sections, { id: 'sources', title: 'Sources' }].map(item => <a key={item.id} href={`/${id}/${item.id}`} aria-current={active === item.id ? 'location' : undefined}>{item.title}</a>)}
      </nav>
      <main className="article-body">
        <div className="article-intro"><Banner kind={id === 'sneak-bench' ? 'night' : id === 'fly-chess' ? 'clouds' : 'figure'} /><div className="article-title reveal"><h1>{experiment.title}</h1><p>{experiment.intro}</p></div></div>
        {experiment.sections.map(item => <section className="article-section reveal" id={`article-${item.id}`} key={item.id} aria-labelledby={`heading-${item.id}`}>
          <h2 id={`heading-${item.id}`}>{item.title}</h2>
          {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {id==='fly-logo'&&item.id==='results'&&<CostResults/>}
        </section>)}
        <section className="article-section article-sources reveal" id="article-sources" aria-labelledby="heading-sources"><h2 id="heading-sources">Sources</h2><ul>{experiment.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}<ArrowTopRightIcon aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></section>
        <footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments">GitHub</a></footer>
      </main>
    </div>
  </div>;
}
