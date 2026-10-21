# Gate 5B — Owner-review prototype: Vision, Circle, Community and Money
**21 October 2026 · not a production design approval**

## What was built
A deliberately **separate** working frontend prototype at:

`#/preview/gate5b`

It is not merged into the existing Living Workspace navigation or controller. The approved three-column workspace remains byte-for-byte unchanged; the prototype uses its recognisable visual grammar as a separate owner-review surface: purpose navigation on the left, an illustrative KS001-guided interaction in the centre, and a compact next-action/truth panel on the right. Responsive layout stacks use the same small typography and accessible buttons.

## Four purpose stories (one human language)

| Area | Human purpose | Example you can click | Boundary before My Work |
|---|---|---|---|
| Vision | Imagine what could be possible | My workshop dream: furniture, apprenticeships, or keep exploring | A Dream is not an Agreement, verified quotation or Money instruction |
| Circle | Decide and work together | Member proposes an apprenticeship corner, others discuss cost or governance | Support is not a vote; membership is not acceptance; actual Circle authority needed |
| Community | Meet people and find help | School furniture repair: offer help, find a Master or learn | LIVE and public opportunities never reveal Circle-only content |
| Money | Understand financial possibilities | KES 400 delivery with missing goods and destination | Money follows the Agreement; no provider quote, rail or release authority before sufficient terms and acceptance |

### The link connecting them

Vision (private ideas) → optionally take selected plan to My Work.

Circle (governed group work) → only a real authorised decision can be handed to My Work.

Community (public belonging and discovery) → an opportunity can lead to a Circle or separately agreed work.

Money (My money, Borrow, Invest, Protect) → the financial options make sense only relative to a real Agreement and independent provider authority.

The **same KS001 identity** has different conversational behavior by space: exploration in Vision, social context in Circle/Community, and strict material trade questions in My Work. This prototype is **only visual and local**, not a second model/controller.

## Review mechanics and safety

- Four prominent purpose buttons + navigation rail with short literal purposes.
- Each area has a human starting point, **one meaningful illustrative next question**, three selectable answer pills, a changing **local** consequence, an explicit boundary and a meaningful next step.
- Choosing a different space does not transfer answers, membership, duties or money state.
- All examples are labelled as sample. No files, backend, real KS identities, searches, invites, paid model, provider quotes, Agreement creation or payment requests are performed.
- The clear **Back to approved workspace** link keeps the existing layout/route untouched.
- No localStorage or persistence; refresh resets the sample. No marketing promise, fake certification or server-authority inference.

## Owner review questions

1. Can a first-time user explain the difference among all four spaces in one sentence?
2. Does the transition to My Work feel natural, rather than four separate products?
3. Is a Circle's governance/consent visibly different from a Community public opportunity?
4. Is Money clearly an assistant to a person's plan, not an advertisement or a premature charge?
5. Is the centre KS001 question human, specific and useful without copying production trade logic?
6. Should the sample retain the three-column proportions and visual DNA of the approved workspace?

**Do not port into signed-in production flow until the owner explicitly approves the prototype.**

## Certification and dependencies

Focused node tests guarantee no gateway/controller mutation, preserved parent Living Workspace component, four distinct areas, input feedback, and responsive container. Full frontend typecheck, lint, build and inherited convergence are required. Even a green UI CI means **presentation engineered**, not owner approved or staging certified.

Paul's staging remains independent. API Gate 5A (#339) tests three synthetic Agreement identities; Gate 4C human/live model work still requires independent staging. No payment or production changes.
