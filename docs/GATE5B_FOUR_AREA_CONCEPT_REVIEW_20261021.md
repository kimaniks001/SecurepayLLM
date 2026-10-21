# SecurePay Gate 5B — owner-review prototype, 21 October 2026

## Purpose — not another feature release

The owner rejected the confusing Phase 7 presentation of Vision, Circle, Community and Money and required a prototype **before further approvals**. This branch presents those purposes clearly inside the **existing approved three-column Living Workspace** (tool rail, central area, right-hand summary); it does not redesign the real screens or rewrite their controllers.

**Open locally with a built Vite frontend:** `#/preview/living-workspace/gate5b`

Optional direct concept areas:
- `#/preview/living-workspace/gate5b/vision`
- `#/preview/living-workspace/gate5b/circle`
- `#/preview/living-workspace/gate5b/community`
- `#/preview/living-workspace/gate5b/work`
- `#/preview/living-workspace/gate5b/money`

The real signed-in and signed-out routes `#/preview/living-workspace/{work|vision|circle|community}` are unchanged and are **not** an approval of this prototype.

## The five doors (what each is and is not)

| Door | Human purpose | Boundary |
|---|---|---|
| Vision | My private place to dream, save thoughts and develop a plan | No automatic publishing, invitation, agreement or money |
| Circle | My chosen small group working or learning together | Circle-only content never enters public LIVE; Circle invitations don't create Trust Project membership or Agreement consent |
| Community | Wider discovery, conversation, opportunities, learning and relationships | No private Circle material exposed; discovery doesn't book, hire or invite automatically |
| My Work / KS001 | Material facts, useful draft, SecurePay Check, actual party review and Agreement acceptance | Draft check isn't acceptance; accepted agreement is not money execution |
| Money | My Money, Borrow, Invest, Protect, in the context of dreams and Agreements | Real institution/provider facts, eligibility and permissions required; no funding, cover, settlement or release from a sample |

**No forced pipeline.** Someone can stay in Vision, learn in Community or collaborate in a Circle without creating a paid transaction. Money always follows the actual Agreement where relevant, never a prototype's local selection.

## Realistic examples to review

1. **Eight-person chama, KES 2,000/month each:** a private idea is not a member invitation; Circle governance discussion is not agreement by eight parties; KES 16,000 potential total is not money collected.
2. **Office chair delivery, KES 400 proposed fee:** a photo is not delivery proof; KS001 must ask what goods are delivered before considering readiness; amount is not payment.
3. **Neighbourhood water project:** a Vision can be explored privately, members can organise an actual Circle, Community can help locate Masters/Plugs/apprentices, and separate Agreements may define materials, tasks, inspections and money.

For each example the reviewer can switch across five areas, choose a possible next-step handoff **locally**, and inspect the right summary's unequivocal outcomes: nothing saved/shared, no Agreement checked, no party accepted, and no money connected/moved.

## Code isolation

- `RuntimeApp` recognises only the opt-in `#/preview/living-workspace/gate5b[/area]` route and passes **undefined** as both the KS001 agent gateway and all authenticated workspace gateways.
- `Phase1LivingWorkspacePreview` uses its original three-column wrappers, rail geometry, current live architecture and actual untouched controllers everywhere except the opt-in concept route. In concept mode it doesn't consume pending private conversation/money resume hints, open tools or invoke real backend services.
- `Gate5BConceptReview` is an interactive **local editorial demonstration**, backed by static `gate5bConcept` definitions, with no network, persistence, membership creation, invitations, AI calls, quotes, Agreement writes or Money endpoints.
- No auth, API, migrations, production settings, money provider/rail, KS001 AI prompts or existing approvals are changed. No mock member or client session claims to be real.

## Review protocol — explicit owner sign-off required

Open the dedicated concept preview on desktop and mobile. Choose each of the three examples, visit all five doors, try the Money choices and the local “possible next step” button. Decide:
1. Can a first-time person tell the difference between these areas in seconds?
2. Is My Work visibly the Agreement home, with KS001's referee authority clear?
3. Is Vision genuinely private by default and Circle content scoped to membership?
4. Does Community feel welcoming and useful beyond transactions?
5. Does Money feel helpful rather than a premature request to pay?
6. Has the three-column masterpiece remained intact?

Please give feedback against the **prototype**, not its underlying live modules. Do not merge to API/UI main or deploy to public production until the owner approves the purpose and journey. Only after explicit approval should a subsequent implementation PR update the production areas with narrowly authorized routing, while Paul independently completes protected staging and Gate 4C real-model human tests.

## Verification

New Gate 5B CI performs executable data/privacy and frozen-layout tests, the entire existing frontend regression, typecheck, lint, build and desktop/mobile Playwright with **zero external or write requests**. On GitHub Actions completion, browser screenshot artifacts can be downloaded from the run.

**Status: prototype engineering, owner review pending. Live staging and human KS001 certification remain separate.**
