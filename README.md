# Experiments of M3BIONIX

A minimal experiment index with Sneak Bench, Fly Chess, Fly Tic Tac Toe, and Fly Logo. React, TypeScript, Vite, beUI, Instrument Serif, and Satoshi. The experiments repository was empty when cloned; the monochrome style follows the personal website repository.

## Run locally

Frontend:

```sh
npm install
npm run dev
```

Neural backend (Python 3.11+, uv, a C++17 compiler, several GB of free disk space; 16 GB RAM recommended):

```sh
cd backend
uv sync
uv run python prepare.py
uv run uvicorn server:app --host 127.0.0.1 --port 8001
```

Preparation downloads approximately 1.1 GB of MaleCNS inputs and verifies source and graph checksums. No videos are downloaded. The first neural start compiles the C++ kernel. Keep both processes running and open http://localhost:5173. The frontend proxies `/api/brain` to the local backend. Loading, unavailable, busy, and failed inference states are explicit; there is no substitute AI player.

- `/#/fly-chess`: play White against the fly, including legal moves, check/checkmate, castling, en passant, promotion choice, draws, and move history.
- `/#/fly-tic-tac-toe`: play X against the fly, with wins, draws, reset, and retry on backend failure.
- `npm run build`: type-check and produce `dist`.
- `npm run preview`: serve the production frontend locally.

The current backend is for local use. Publishing the static frontend alone does not deploy the neural simulator. No deployment is included.

## What the opponent actually is

The numerical backend is adapted from the neural modules in [Fly / Wirehead](https://github.com/mattyhempstead/fly-wirehead), with upstream revision and MIT attribution retained in `backend/vendor/REVISION` and `backend/licenses/`. The prepared MaleCNS graph contains 166,700 neurons and 25,582,938 weighted directed edges. See `backend/THIRD_PARTY.md` for dataset and model provenance.

Each board is rendered as a 128×128 image and supplied to the upstream inferred visual projection. The full LIF simulation advances 100 ms from the same reset state per turn. Learning and artificial reward are disabled. Spikes in 1,342 annotated descending neurons are averaged into 64 fixed pools, sorted by source neuron ID.

Tic tac toe scores an empty cell from its corresponding pool. Chess scores legal moves by destination pool plus 0.25 times the origin pool. Equal scores use a fixed UCI/cell order, which the UI reports. This readout is engineered and untrained. It does not show that a fly understands chess or has learned strategy. Python-chess and chess.js enforce rules; neither supplies a strategic opponent. FlyGym is not needed for the games; the separate Fly Logo recordings include a simulated body.

Measured input/spike hashes, counts, pool rates, timing, and chosen moves are saved to ignored `backend/runs/moves.jsonl`. Each game displays the last actual neural response. Board state and game rules are separate from neural activity and the move readout.

## Pages and assets

The index has four accordion entries and no banner. Each `/#/experiments/<id>` article has a banner, a top action, concise rationale/method sections, and sources. Instrument Serif and Satoshi are self-hosted. Banners are optimized copies of the supplied Downloads images; originals are unchanged.

The chess board uses Colin M. L. Burnett's SVG pieces from Lichess. Attribution and GPLv2+ license are in `public/pieces/`. Games load separately from the Three.js view. Article heatmaps run only when requested, so reading an article does not occupy the simulator.

The 3D view uses 139,662 actual MaleCNS soma positions; the simulation includes all 166,700 neurons. It displays measured spikes as ten 10 ms intervals, paced by 80 ms pauses for visibility. It shows cell bodies, not full neurite skeletons. The last frame remains visible and labeled. There are no decorative or random spikes.

The board remains sharp during moves. Short blur/fades replay on navigation, back navigation, and accordion opening. Reduced motion disables effects. The motion opportunity audit is in `docs/motion-audit.md`.

## Chess recovery

Zero scores among legal actions are ties resolved by the documented fixed order, rather than failed moves. An entirely silent/nonfinite output still fails explicitly. The frontend retries a busy model for up to eight intervals of 750 ms, times out a stalled request after 45 seconds, and offers a retry without losing the position. New game and navigation abort stale responses. Promotion, checkmate, and draws use chess.js rules; the backend independently checks legality.

## Fly Logo recordings

`/#/experiments/fly-logo` introduces the experiment; `/reports/neural-logo/index.html` redirects to the in-app `/#/fly-logo` replayer, which uses the shared design system and requires no neural backend. All 100 raw recordings, summaries, controls, protocol, verification and chart were copied from the supplied `app/results/neural-logo-100` directory. `source-manifest.json` records the source file hashes. The original files were not edited.

The report is a recorded neural/body experiment, separate from the original live arena's contrast baseline. First approaches: Instagram 12, Google 9, WhatsApp 10, YouTube 12, no choice 57. Total network spikes: 369,323,006. The results do not establish addiction or logo preference. All 125 isolated exposures recorded zero PAM11 spikes, displayed as explicit values rather than an empty plot. The network was active, and the separate artificial positive control activated PAM11.

## Verification

```sh
npm run build
cd backend
FLY_FULL_TEST=1 uv run --with pytest python -m pytest tests -q
cd ..
npx playwright test tests/ui.spec.ts --workers=1
backend/.venv/bin/python tests/live-chess.py
python3 tests/verify-logo.py
```

Browser tests require a running frontend and prepared neural backend. The browser executable in the test configuration matches this Mac's installed Playwright Chromium; update it on another host. Backend tests cover all reachable tic-tac-toe states, sparse-output chess sequences, special moves, terminal positions, replayability and streamed neural counts. Browser coverage includes real replies, castling, en passant, both colors' promotion, checkmate, timeout, busy/retry, reset cancellation, offline state, mobile layout and report playback. Special-rule browser tests use controlled legal opponent replies; the long-play test uses actual neural inference.

## Known chess behavioral failure

The rules/transport tests pass, but the raw neural readout is highly repetitive: 62 immediate reversals in 90 tested replies. The behavioral gate fails. A baseline-subtracted candidate also failed (53/90) and was not adopted. See `docs/verification.md` and `/reports/chess/readout-evaluation.json`. Do not describe this as a competent chess player or use legal reply counts as evidence of strategy.

## beUI controls

Installed from the live `@beui` shadcn registry: `button-base`, `bouncy-accordion`, `select`, `range-slider`, and `loader`. Source and required helpers are retained in `src/components/motion` and `src/lib`. `components.json` declares the registry; Tailwind v4 provides component utility styles, mapped to the existing monochrome tokens and fonts. App composition is in `src/UI.tsx`. Registry internals were not forked.

The homepage and expandable notes use beUI accordions. Game/replay actions use beUI buttons, trial selection uses Select, and both time inspectors use RangeSlider. Board inputs use the same button primitive with press/hover scaling disabled to preserve square positions. Measurement plots remain scientific figures rather than being replaced with decorative UI charts. The original PNG research figure is restored alongside the explicit measured-zero explanation.

M3BIONIX links are underlined and point to `https://m3bionix.com/`. Header navigation and the external brand link are separate anchors.

### Production neural backend

The backend service uses `backend/Dockerfile.vercel`. Its build downloads the checksum-locked MaleCNS source, prepares the graph, and compiles the C++ kernel for Linux. It must not be deployed as an empty Python function: the model data is deliberately excluded from Git. Runtime uses one Uvicorn worker because the model is memory-heavy and each instance serializes inference.

The production origin `https://experiments.m3bionix.com` is allowed. Additional exact origins can be supplied as a comma-separated `ALLOWED_ORIGINS` environment variable. Move logs go to the temporary directory by default; set `FLY_RUNS_DIR` for persistent storage. Logs in temporary storage are not a durable research record.

After deployment, verify `/api/brain/status` reaches `ready`, then submit real chess and tic-tac-toe positions to `/api/brain/play`; a successful static-page build alone does not verify gameplay.
