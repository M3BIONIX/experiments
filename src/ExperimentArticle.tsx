import {ButtonLink} from './UI';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowTopRightIcon } from '@radix-ui/react-icons';
import './article.css';
import { Banner } from './Banner';
import {RewardResults} from './RewardResults';
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
 'fly-chess':{title:'Fly Chess',intro:'Play against a simulated fly nervous system.',tryHref:'#/fly-chess',sections:[{id:'evaluation',title:'Current result',paragraphs:['The earlier square-based rule often moved a piece back and forth. The new rule changes the assignment of legal moves to measured neuron groups for each position, with no bonus for rooks or any other piece.','In three actual neural games with 30 replies each, the new adapter made zero immediate reversals and used all six piece types. Rooks made 5 of the 90 moves. The earlier evaluation recorded 62 reversals in 90 replies.','The variety comes partly from our reproducible position-based assignment. The fly has not learned chess, and these tests do not measure strategic strength or guarantee that repetition can never occur.']},...flySections(true)],sources:[...flySources,{title:'Current move-variety test: 90 actual neural replies',href:'/reports/chess/position-readout-evaluation.json'},{title:'Earlier square-based adapter evaluation',href:'/reports/chess/readout-evaluation.json'}]},
 'fly-tic-tac-toe':{title:'Fly Tic Tac Toe',intro:'Nine cells. One fly-connectome simulation.',tryHref:'#/fly-tic-tac-toe',sections:flySections(false),sources:flySources},
 'fly-logo':{title:'Fly Logo',intro:'Can seeing an app logo trigger a reward response?',tryHref:'#/experiments/fly-logo/results',sections:[
 {id:'about',title:'Why we tried this',paragraphs:['The idea came from opening apps such as Instagram: could the logo become a sign of something rewarding before we even open the app?','We wanted to ask a similar question in a simulated fly brain. Does simply seeing an Instagram, Google, WhatsApp, or YouTube logo trigger a response in the brain cells involved in dopamine signaling? Would the fly then choose to approach that logo more often?','Approaching the logo was our stand-in for choosing to open an app. The fly did not actually open or use an app. We wanted to test whether the picture itself could become a reason to choose it.']},
 {id:'method',title:'What we did',paragraphs:['The latest experiment tested one part of that question: whether a logo could become a reward cue after training. We showed the computer fly a logo and sent its brain a programmed reward signal at the same time.','To make a fair comparison, we tried three ways: give the reward with the picture; give the same reward at a different time; or give it with the picture but switch learning off. This helps us ask whether connecting the picture and reward makes a difference.','We used 12 starting setups for each way: four logos, with three setups each. That made 36 training runs. Each run received the same amount of reward.','Then we stopped giving rewards and watched where the fly went. We tried three tests: show the logos without reward; show the trained logo 20 more times without reward before testing; or put it farther away. The last two tests each started from the saved training, not one after the other.','That made 108 short walking tests. Each lasted up to three seconds. We counted whether the fly reached the logo it had been taught about before any other logo. Walking somewhere else, or reaching no logo, did not count.']},
 {id:'results',title:'What we saw',paragraphs:['At first, the fly taught with a picture and reward went to that picture first in 3 out of 12 tests. The other two groups did so in 1 and 2 tests.','But the small lead did not last. After seeing the picture 20 times without a reward, it went there first in only 1 out of 12 tests. With the picture farther away, it also did so in only 1 out of 12.','So we saw a small early difference, but no lasting pattern of coming back more often than the other groups. These few tests are not enough to say that one logo works better than another.']},
 {id:'answer',title:'What we learned',paragraphs:['Did seeing the logo make the fly keep choosing it? After reward training, we did not see a lasting increase in choosing the trained logo across the later tests.','Our original question was whether seeing the logo itself could trigger a dopamine-related response and encourage another approach. The reward signals recorded during training were supplied by the program, so those signals alone do not answer that question. The walking tests checked whether the fly would choose the logo after we stopped supplying reward.','We did not test whether the fly disliked the logos. Moving a picture farther away was just a longer walk, not a punishment.','This was a small computer experiment. It does not tell us what real flies feel, and it cannot prove addiction. The answer is simply: we tried teaching a logo-and-reward connection, but did not see a lasting reason to come back.']}
 ],sources:[{title:'Latest experiment: full record',href:'/reports/reward-followup/report.md'},{title:'Latest experiment: all 108 tests',href:'/reports/reward-followup/probe-results.csv'},{title:'Latest experiment: checks',href:'/reports/reward-followup/verification.json'}]},

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
      <div className="article-home brand-home"><a href="#/"><ArrowLeftIcon aria-hidden="true"/><span>Experiments</span></a><span className="brand-credit">of <a href="https://m3bionix.com/">M3BIONIX</a></span></div>
      <ButtonLink className="try-link" href={experiment.tryHref} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{id==='fly-logo'?'Explore results':`Try ${experiment.title}`}<ArrowTopRightIcon aria-hidden="true" />{external && <span className="sr-only"> (opens in a new tab)</span>}</ButtonLink>
    </header>
    <div className="article-layout">
      <nav className="article-nav" aria-label="On this page">
        {[...experiment.sections, { id: 'sources', title: 'Sources' }].map(item => <a key={item.id} href={`#/experiments/${id}/${item.id}`} aria-current={active === item.id ? 'location' : undefined}>{item.title}</a>)}
      </nav>
      <main className="article-body">
        <div className="article-intro"><Banner kind={id === 'sneak-bench' ? 'night' : id === 'fly-chess' ? 'clouds' : 'figure'} /><div className="article-title reveal"><h1>{experiment.title}</h1><p>{experiment.intro}</p></div></div>
        {experiment.sections.map(item => <section className="article-section reveal" id={`article-${item.id}`} key={item.id} aria-labelledby={`heading-${item.id}`}>
          <h2 id={`heading-${item.id}`}>{item.title}</h2>
          {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {id==='fly-logo'&&item.id==='results'&&<RewardResults/>}
        </section>)}
        <section className="article-section article-sources reveal" id="article-sources" aria-labelledby="heading-sources"><h2 id="heading-sources">Sources</h2><ul>{experiment.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}<ArrowTopRightIcon aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></section>
        <footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments">GitHub</a></footer>
      </main>
    </div>
  </div>;
}
