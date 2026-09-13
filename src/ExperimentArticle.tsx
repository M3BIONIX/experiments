import {ButtonLink} from './UI';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowTopRightIcon } from '@radix-ui/react-icons';
import './article.css';
import { Banner } from './Banner';
import {LogoResults} from './LogoResults';
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
 {id:'how',title:'How it works',paragraphs:['The program turns the board into an image and sends it to a simulated fly brain. It runs for one tenth of a second of simulated time, then a fixed rule converts the resulting brain signals into a move. The game allows only legal moves.',chess?'The program assigns groups of brain cells to board squares. Their activity gives each possible move a score. Ties use a fixed order. The fly has not been taught chess strategy.':'Each empty square is linked to a group of simulated brain cells. The group with the most activity determines the move. Ties use a fixed order.']},
 {id:'limits',title:'Reading the activity',paragraphs:['During play, the 3D view shows where simulated brain cells sent electrical pulses. The dots mark cell locations, not their full branching shapes. Open the response details after a turn for the recorded numbers.',...flyLimits]},
];
export const articles:Record<string,Experiment>={
 'sneak-bench':{title:'Sneak Bench',intro:'Can one AI model identify another through conversation?',tryHref:'https://sneakbench.m3bionix.com/',sections:[
 {id:'about',title:'About',paragraphs:['Models take the role of a therapist and try to identify the model on the other side of a conversation.']},
 {id:'why',title:'The question',paragraphs:['Models have recurring habits: phrasing, follow-up questions, and ways of avoiding an answer. Sneak Bench asks whether another model can use those clues to recognize its conversation partner.']},
 {id:'how',title:'Explore the benchmark',paragraphs:['Open Sneak Bench to see the conversations and available results. The therapist role provides a conversational format; the task is model identification.']}
 ],sources:[{title:'Sneak Bench',href:'https://sneakbench.m3bionix.com/'}]},
 'fly-chess':{title:'Fly Chess',intro:'Play against a simulated fly nervous system.',tryHref:'#/fly-chess',sections:[{id:'evaluation',title:'Current result',paragraphs:['The current readout produces highly repetitive play. In three 30-reply evaluations, 62 of 90 neural replies reversed the fly’s previous move. The longest run contained 22 consecutive reversals.','Earlier checks verified legal moves, response delivery, and spike measurements. They did not evaluate playing quality. A separate behavioral check now fails this version for repeated back-and-forth play.','Subtracting the neural response to an empty board still produced 53 reversals in 90 replies. That candidate was not adopted. This remains an untrained interface experiment, not a capable chess opponent.']},...flySections(true)],sources:[...flySources,{title:'Readout evaluation: raw and calibration candidate',href:'/reports/chess/readout-evaluation.json'}]},
 'fly-tic-tac-toe':{title:'Fly Tic Tac Toe',intro:'Nine cells. One fly-connectome simulation.',tryHref:'#/fly-tic-tac-toe',sections:flySections(false),sources:flySources},
 'fly-logo':{title:'Fly Logo',intro:'Could a fly get hooked on a logo?',tryHref:'#/fly-logo',sections:[
 {id:'about',title:'The question',paragraphs:['Could simply seeing an Instagram, Google, WhatsApp, or YouTube logo trigger a positive or negative response in a fly? And if a logo were paired with a reward, would the fly learn to seek it out?','That was the idea behind Fly Logo: explore whether a logo could become something a simulated fly keeps coming back to. We started with simple viewing tests, then completed a reward-training follow-up. Neither established addiction.']},
 {id:'method',title:'What we actually tested',paragraphs:['We put a simulated fly in a space with four logos and recorded where it walked. We ran this 100 times, changing the logo positions and the fly’s starting direction. Each recording lasted up to three seconds.','We also showed each logo on its own 25 times, for one fifth of a second each time. Another 25 presentations showed a blank image for comparison. This gave us 125 separate-image tests.','We tracked electrical pulses from 15 simulated dopamine-producing brain cells. Their name in the dataset is PAM11. This is the name of a cell group, not a pleasure meter or an addiction score.','No reward was given during these logo tests. They therefore did not test whether a fly could learn to associate a logo with a good or bad outcome.']},
 {id:'results',title:'What happened',paragraphs:['In 57 of the 100 walking trials, the fly did not get close to any logo. It first approached Instagram in 12 trials, YouTube in 12, WhatsApp in 10, and Google in 9. Getting close meant coming within 3 mm of a panel.','The 15 monitored cells produced no electrical pulses in any of the 125 separate-image tests. In the walking trials, they produced just three pulses in total. Because all four logos were visible together, those three pulses cannot be assigned to a particular logo.']},
 {id:'limits',title:'What the results mean',paragraphs:['We cannot rank these logos by how addictive they are. Walking near a logo does not show that the fly liked it, and zero pulses do not mean that it disliked it. The recordings do not establish either attraction or aversion.','The zero values are present in the saved measurements; they are not missing chart data. A separate check directly stimulated the monitored cells and produced a response. This checks that stimulation can be recorded, but it does not prove that the model responds to pictures like a real fly.','Those initial tests did not include reward training. The completed follow-up below addresses learned preference and whether it lasts. The software also makes assumptions about how images reach the simulated brain and how its signals drive walking.']},
 {id:'followup',title:'Then we tried adding a reward',paragraphs:['The follow-up completed 36 training conditions and 108 tests without reward. Each comparison used the same 12 scenes: four logos, with three starting setups each. These were matched simulations, not 12 real flies.','One group received a programmed reward signal while seeing its assigned logo. A second received the same reward on blank images at a different time. A third received reward with the logo, but its learning was switched off. The chart calls these paired, unpaired, and frozen.','Every condition received the same four seconds of reward stimulation during training. Before testing, leftover neural activity was cleared while learned changes were kept. Reward and further learning were switched off during the walking tests.','We tested three situations: reward removed; after 20 more views without reward; and with the trained logo farther away, at 14 mm instead of 10 mm. The last two tests started separately from the trained state. The farther logo was enlarged to keep its apparent size roughly similar. Each test lasted up to three seconds.']},
 {id:'followup-results',title:'What the reward tests found',paragraphs:['With reward removed, the paired group approached its trained logo first in 3 of 12 scenes, compared with 1 of 12 for reward given separately and 2 of 12 with learning disabled. That is a small descriptive difference, not evidence of a reliable preference.','After 20 unrewarded views, the paired group approached first in only 1 of 12 scenes; both controls did so in 2 of 12. With the logo farther away, the counts were 1, 2, and 1. The initial advantage did not persist across either follow-up comparison.','We also measured time spent near the trained logo. After unrewarded viewing, the paired group spent less time there than both controls. It spent slightly more time there in the distance test, but that secondary measurement does not reverse the failed persistence result.','Training produced 189,556 pulses in the monitored cells, including the deliberately supplied reward. Thousands of adjustable connections changed in both learning-enabled groups; none changed with learning disabled. This shows the reward and learning machinery operated, not that a logo was naturally rewarding.']},
 {id:'answer',title:'The final answer',paragraphs:['Did these logos get the simulated fly hooked? This experiment did not demonstrate that. Reward training did not produce a lasting approach advantage across the follow-up tests, and we cannot rank the logos by addictiveness.','The original image-only tests found no pulses in the monitored cell group. The later reward signals came from our programmed stimulation. Neither result tells us whether a real fly likes or dislikes these logos.','We tested a reward association, not punishment or aversion. Moving a logo farther away added travel distance, not harm, punishment, or a measured energy cost. A separate negative-outcome experiment has not been run.','This is a small model experiment with three scene setups per logo, short tests, and unvalidated connections between pictures, brain signals, and walking. Its memory lifetime is partly programmed. Even persistent seeking would not establish addiction without a suitable validated model and stronger behavioral evidence. A null result here does not prove real flies could never learn a logo association.']}

 ],sources:[{title:'Reward follow-up: full report',href:'/reports/reward-followup/report.md'},{title:'Reward follow-up: recorded checks',href:'/reports/reward-followup/verification.json'},...flySources,{title:'FlyGym: the simulated body',href:'https://github.com/NeLy-EPFL/flygym'},{title:'Recorded method and settings',href:'/reports/neural-logo/protocol.json'},{title:'Checks on the saved results',href:'/reports/neural-logo/verification.json'},{title:'All trial summaries',href:'/reports/neural-logo/summary.json'},{title:'Research on reward learning in real flies',href:'https://www.nature.com/articles/nature11304'}]},

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
          {id==='fly-logo'&&item.id==='results'&&<LogoResults/>}
          {id==='fly-logo'&&item.id==='followup-results'&&<RewardResults/>}
        </section>)}
        <section className="article-section article-sources reveal" id="article-sources" aria-labelledby="heading-sources"><h2 id="heading-sources">Sources</h2><ul>{experiment.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}<ArrowTopRightIcon aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></section>
        <footer><a href="https://m3bionix.com/">M3BIONIX</a><a href="https://github.com/M3BIONIX/experiments">GitHub</a></footer>
      </main>
    </div>
  </div>;
}
