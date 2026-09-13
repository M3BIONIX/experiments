# Correction: behavioral evaluation

The earlier checks below establish rules and request delivery only. They do not establish useful chess behavior. Presenting successful response counts as evidence that chess worked properly was too broad.

A separate real-connectome evaluation used three seeds and 30 black replies per seed, with seeded legal White moves. Raw readout: 62/90 immediate reversals; maximum reversal streaks 22, 10, 17. Empty-board-subtracted candidate: 53/90 reversals; maximum streaks 12, 8, 8. Neither is a satisfactory player. The candidate was rejected; no random or strategic engine was substituted.

`backend/evaluations/compare_readouts.py` generates this comparison. `backend/evaluations/check_behavior.py public/reports/chess/readout-evaluation.json` fails the shipped raw readout. Its four-consecutive-reversals threshold is an explicit prototype diagnostic, not a validated chess-strength benchmark. The recordings and all moves are preserved in the public JSON.

The fixed square assignment and persistent output-pool imbalance are supported by the saved logs: group 7 had the highest mean output rate in 194 of 259 chess responses. Those logs include repeated test positions and are a diagnostic sample, not an unbiased performance estimate.

## Earlier functional checks

Verification, 13 September 2026

- Production type-check and build passed.
- 34 backend tests passed. Includes exhaustive reachable tic-tac-toe positions, 20 seeded sparse-output chess sequences (up to 400 plies each), legal-output masking, castling/en passant/promotion positions, terminal rejection, and real connectome replay/spike consistency.
- 11 Playwright browser tests passed. Twelve actual chess replies; controlled-reply special moves and checkmate; busy retry, stream error/retry, 45-second timeout, cancellation on new game, mobile/dark/reduced-motion, tic-tac-toe completion/reset, report playback/errors/races, and neuron geometry retry/cache.
- Extended real HTTP neural testing: 208 legal replies, with ten measured activity frames and exact summed spike counts per reply. Runs 0 and 1 reached the 80-reply test limit without a terminal position. Run 2 ended in White checkmate after 48 neural replies. These tests establish continued function, not playing strength.
- Independently recounted all 100 logo recordings: first-approach totals and 369,323,006 network spikes match the supplied report. All copied source files match the SHA-256 manifest.
- Desktop, 390px mobile, and 320px dark-mode screenshots inspected. No horizontal overflow in tested narrow layouts.
- Lighthouse production chess: accessibility 100; experimental accessible-name mismatch was fixed and rechecked. Performance sample: 88, LCP 3.6s, CLS 0 on simulated mobile throttling. Three.js remains a 553 kB uncompressed lazy bundle; Vite reports a size warning. The smaller game bundle loads independently, and geometry is cached between games.

The zero-legal-score rejection was reproduced with a sparse-output regression fixture. The original user's exact three-move sequence was unavailable. The default live sequences tested did not reproduce that precise failure before the patch. The fix preserves the existing fixed-order tie policy and reports zero-score ties; it does not fabricate neural activity or add a strategic fallback.

All work is local. No commit, push, or deployment was performed.
