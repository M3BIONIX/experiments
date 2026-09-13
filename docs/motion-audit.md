# Motion opportunities

Design settings: variance 5, motion 3, density 3. Preserve the requested Instrument Serif and Satoshi identity. Native CSS provides the editorial design; Radix provides the accordion. Game and report data stay functional rather than following marketing-layout rules.

Scope: React, Radix accordion, native CSS and WAAPI. Editorial pages are occasional visits; selecting squares and reading neural measurements are frequent functional actions. Shared easing: cubic-bezier(.23,1,.32,1). This is the read-only opportunity audit requested with find-animation-opportunities. Implementation changes are separately authorized by the request to fix the interface and loading.

| # | Location | Today | Purpose | Frequency | Suggested motion |
|---|---|---|---|---|---|
| 1 | Games.tsx:118, promotion chooser | Promotion controls appear immediately | State indication | Occasional | Opacity 0→1, translateY(4px)→0, 160ms cubic-bezier(.23,1,.32,1). No delay on selection. Reduced motion: opacity only 80ms. |
| 2 | Games.tsx:120, recovery message | Stream error appears immediately | Preventing a jarring change | Occasional | Opacity 0→1, 160ms cubic-bezier(.23,1,.32,1); retain position beside retry. Reduced motion: opacity only 80ms. |
| 3 | BrainScene.tsx:77, controls | Buttons lack press feedback | Feedback | Tens/day | Scale 1→.98 on press, 120ms cubic-bezier(.23,1,.32,1). Reduced motion: opacity .85 instead. No hover motion. |

All three pass speed and function gates: short feedback confined to controls or occasional messages, without obscuring data. No hover proposal; pointer hover effects remain gated by fine pointer and hover support.

## Rejected candidates

- Games.tsx board on every move: rejected by function and frequency. A blur hides the position the player must read. Keep the board stable and use last-move highlights.
- BrainScene.tsx idle neural pulsing: rejected by function. Would imply activity that was not measured.
- NeuralActivity.tsx:50 time scrubber: rejected by function. Selected data should update immediately.
- Report counters: rejected by function. Count-up effects make recorded measurements temporarily false.

## Verdict

This interface needs less motion. The highest-value opportunity is readable recovery feedback. Existing route and accordion entrances already cover the editorial transitions. The user-requested blur/fade remains short on navigation and disclosures; it does not run on individual chess moves. Any future motion handoff can use `improve-animations plan promotion chooser entrance`.
