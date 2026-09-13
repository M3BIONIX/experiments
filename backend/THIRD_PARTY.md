# Neural sources

`vendor/flywirehead/neural` and `vendor/flywirehead/data.py` are copied from https://github.com/mattyhempstead/fly-wirehead at the revision in `vendor/REVISION`. These files are adapted from nftechie/stonkfly (itself derived from DOOMFLY); the upstream MIT notice is retained in `licenses/stonkfly-MIT.txt`. No video, 3D scene, or media downloader is included.

MaleCNS v1.0 data is downloaded independently from https://male-cns.janelia.org/download/ under CC BY 4.0. Credit: MaleCNS collaboration, HHMI Janelia, Google Research, and upstream dataset contributors. Source and array checksums remain in the vendor lockfiles. Dataset publication: https://doi.org/10.1016/j.cell.2026.08.015.

The graph retains 166,700 neurons and 25,582,938 weighted directed edges; an edge can represent multiple synaptic contacts. This is distinct from the 125 million synapses described in Google's article.

The LIF physiology and inferred visual projection are approximations. The board rendering and 64 descending-neuron pools are our engineered interface. The model receives a board image for 100 simulated milliseconds from a reset state on each decision. Learning and artificial reward are disabled. Measured pooled rates select among legal moves, with deterministic tie-breaking. No trained board-game competence is claimed. FlyGym is not required: no embodied locomotion is simulated.
