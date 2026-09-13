# Reward-conditioning follow-up

A descriptive approach advantage after training did not persist across both follow-up tests.

Completed **36 training conditions and 108 reward-free behavioral probes**. Each arm has 12 matched scene/logo scenarios (four logos × three seeds); these are not independent biological flies.

| Test | Paired reward | Unpaired reward | Learning disabled |
|---|---:|---:|---:|
| Reward removed | 3/12 | 1/12 | 2/12 |
| After 20 unrewarded exposures | 1/12 | 2/12 | 2/12 |
| Trained logo farther away | 1/12 | 2/12 | 1/12 |

Reward-removed first approaches by trained logo (three matched scenes per cell):

| Trained logo | Paired | Unpaired | Learning disabled |
|---|---:|---:|---:|
| instagram | 1/3 | 1/3 | 1/3 |
| google | 2/3 | 0/3 | 1/3 |
| whatsapp | 0/3 | 0/3 | 0/3 |
| youtube | 0/3 | 0/3 | 0/3 |

Secondary measurement: total time within the trained logo's approach zone across each arm's 12 probes.

| Test | Paired seconds | Unpaired seconds | Learning-disabled seconds |
|---|---:|---:|---:|
| Reward removed | 2.84 | 1.32 | 1.70 |
| After unrewarded exposure | 0.22 | 1.64 | 1.70 |
| Greater travel distance | 0.74 | 0.58 | 0.22 |

The distance probe had slightly more trained-logo dwell in the paired arm despite no first-approach advantage against both controls. That secondary result does not rescue the failed persistence criterion: both approach counts and dwell were lower than controls after unrewarded exposure.

Entries count the **trained logo approached first**, not generic movement. No-logo approaches and approaches to another logo remain distinct in the raw data.

## Mechanism and controls

Training produced 189,556 total PAM11 spikes across the conditions. This includes deliberately programmed reward, not spontaneous logo appeal.
- paired: 3426–3492 of 7,835 plastic edges changed from the common starting weights.
- unpaired: 3416–3537 of 7,835 plastic edges changed from the common starting weights.
- frozen: 0–0 of 7,835 plastic edges changed from the common starting weights.

Reward dose was equal across arms: 4,000 ms of 20 mV-equivalent current per condition. Paired and frozen arms received it with the cue; the unpaired arm received it on blank frames separated from the cue block by five seconds. Block order alternated by seed.

Transient neural dynamics were cleared before each probe while learned weights and memory variables were retained. This is a deliberate model intervention to isolate memory from residual stimulation. Both plasticity and passive memory updates were frozen during behavioral probes; extinction exposures allowed learning except in the frozen-control arm.

## Persistence and cost

Extinction comprised 20 further cue presentations without reward (8 simulated seconds including gaps). The effort probe moved the trained logo from a 10 mm radius to 14 mm and enlarged its panel by 1.4× to approximately preserve its apparent size from the centre. This is additional travel distance, not an aversive outcome, punishment or a metabolic-cost model. The increased-distance probe started from the original trained weights, separately from the extinction branch. All probes had a three-second horizon.

## What this does not establish

Addiction is not established. Even persistent weights or seeking would not be sufficient: the model has an explicitly programmed 1,800-second memory-decay constant and has not been validated for addiction, drug-like dependence, subjective reward, or real-fly visual preference. A null result is also not proof that real flies could not learn such an association.

The visual training uses displayed images; behavior uses rendered eye views through an unvalidated sensory and motor adapter. Three scene seeds per logo provide a bounded model experiment, not a powered biological study. Positions and headings were matched across arms, but logo positions were not exhaustively counterbalanced. The small matched differences are reported descriptively; no significance or population-generalization claim is made.

A separate punishment/aversion experiment and a validated longer-duration dependence model have not been run. The present battery tests the stated reward-pairing, reward-removal, repeated-unrewarded-exposure, and increased-distance hypotheses.

Full timing, currents, measured spikes, learned weight arrays, trajectories and matched differences are saved beside this report. Source: https://github.com/mattyhempstead/fly-wirehead .

10 probes ended before the three-second horizon on leaving the observation area; the shortest lasted 2.56 seconds. These outcomes were retained. Total recorded behavioral time was 321.60 seconds.
