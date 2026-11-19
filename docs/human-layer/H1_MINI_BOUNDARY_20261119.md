# Mini — H1 Human Layer entry boundary (development, not a preview release)

The pure `src/features/human-layer/humanLayerEntry.ts` contract prepares local help intent for Buy, Sell, Pay, Collect and a versioned Living Agreement. It includes **no private transcript, location, payment details, selected provider, sharing consent or authorization token**. The Mini client must never treat an Agreement pointer as read authority.

This file does not add a screen, route or provider interaction. The existing Mini Help view accurately says it does **not** contact a person or create a support request; keep that truthful until H3/H6 are connected to real backend authorities.

**Mini is the only review preview for the Human Layer.** H2 will implement the first private Agreement Conversation in Mini using the canonical server message thread and real participant access. Do not substitute Living Workspace, an older Business UI or a mock provider directory.

Future H3–H8: KS001 help, verified Plug/Master paths, geographic routing and total quote, accepted linked task with its own conversation and limited consented summary, then impartial resolution/consented amendment.

Test locally in a full Mini checkout: `node --test tests/human-layer-h1.test.mjs`, `npm run typecheck`, `npm run build` and affected regression tests. No change is merged or deployed by this H1 branch.
