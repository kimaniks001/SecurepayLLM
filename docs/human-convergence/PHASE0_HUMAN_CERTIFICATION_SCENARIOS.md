# SecurePay Human Certification Scenario Suite

These scenarios are permanent human-size certification tasks. They are not backend load tests. They test whether an ordinary person can see, understand, preview and act without reading instructions.

Interaction counts exclude passive scrolling and include only deliberate taps/clicks/submissions.

| ID | Scenario | Starting screen | First visible cue | Expected path | Max interactions | Expected result | Failure conditions | Primary phase |
|---|---|---|---|---|---:|---|---|---|
| HC-01 | You have three Agreements. Find the one involving Kamau. | Agreements | Search/find cue or immediately scannable names/people | Search/type Kamau → matching Agreement preview | 2 | Correct Agreement is identifiable without opening every Agreement. | Must open multiple Agreements; no search; result hides party context. | Phase 1 |
| HC-02 | Look at an Agreement without editing anything. | Agreements | Agreement row/card clearly looks inspectable | Tap Agreement → quick preview/sheet → dismiss | 2 | Person sees title, counterparty, status, summary and next step without entering full detail. | First tap forces full page; preview exposes edit/commit as default. | Phase 1 |
| HC-03 | Find which Agreement needs your attention. | Home or Agreements | “Needs you” / action-required cue | Tap attention cue or filtered Agreement list | 2 | Person identifies the Agreement and required action. | Must inspect Agreements one-by-one; system terminology required. | Phase 1 |
| HC-04 | Add a photo to KS001. | Home / KS001 | Obvious Add/attachment affordance | Add → Photo/Camera → choose/capture → upload | 3 | Real photo upload is acknowledged only after bytes are accepted. | Photo option hidden; person must type a command; local-only fake success. | Phase 4 |
| HC-05 | Paste meeting minutes into KS001. | Home / KS001 | Add/Paste cue or input that clearly accepts pasted content | Paste → submit | 2 | Minutes enter the same conversation/build and SecurePay can summarize/extract. | Separate obscure route; paste treated as ordinary tiny chat only; content lost. | Phase 4 |
| HC-06 | You have never used Vision. Save one idea. | Vision | Add/Capture idea is visible in five seconds | Capture idea → enter text → save | 3 | Idea appears in appropriate Vision shelf/list. | Must understand shelves first; Add hidden; unclear save state. | Phase 3 |
| HC-07 | Find an idea you previously saved in Vision. | Vision | Search/find cue | Search/type phrase → open result | 2 | Correct item is found without opening shelves manually. | Search hidden; must browse many cards; no result context. | Phase 3 |
| HC-08 | Find out whether KES 20,000 can move for an Agreement. | Agreement detail or Money handoff | Money / “Can money move?” cue | Open Money → read movement answer | 2 | Clear yes/no/blocked answer grounded in backend movement preflight. | Person must interpret rails/settlement architecture; answer inferred client-side. | Phase 2 |
| HC-09 | Find how much money remains to fund. | Agreement detail or Money | Remaining/funding summary | Open Money if needed → read Remaining | 2 | Remaining amount is shown prominently with currency. | Requires calculation; buried in ledger detail; ambiguous “remaining”. | Phase 2 |
| HC-10 | Find the charge associated with a payment without payment architecture permanently occupying the screen. | Money | Quiet Charges link/summary | Charges → concise breakdown | 2 | SecurePay charge, provider/rail charge and total are available on demand. | Charges hidden entirely; architecture dominates default page; amount is hard to relate to payment. | Phase 2 |
| HC-11 | Add something you sell to your Store. | My Store | “Add offer” is visible immediately | Add offer → enter minimum fields → review/publish or save draft | 3-4 | New offer is truthfully created/drafted. | Add offer buried; must navigate to Account; generic admin language obscures action. | Phase 5 |
| HC-12 | Change availability where that capability exists. | My Store / Plug context | Availability attention/control when relevant | Open availability → change/confirm | 2 | Real availability is updated and reflected. | User must know Market Network terminology; control absent when update is due. | Phase 5 / 6 |
| HC-13 | A piece of work has been reported complete. Find how to Hold or challenge it. | Notification / Circle / Agreement | “Needs your response” / Ready for review cue | Respond Hold inline OR open relevant review context | 1-2 | Coordination hold is recorded as coordination, or formal review challenge is routed to Agreement authority as appropriate. | “Hold” silently becomes milestone rejection/acceptance; unnecessary page maze; no action visible. | Phase 8 |
| HC-14 | Get practical help from a Plug when the situation requires one. | Relevant Project/Store/Agreement context | “Get practical help” contextual cue | Request help → see candidates/next state | 2-3 | Real Market Network request is created; no Plug is auto-assigned without selection. | Must discover Ecosystem manually; “Plug” internal role knowledge required before need is expressed. | Phase 6 |
| HC-15 | Ask for experienced help from a Master when appropriate. | Relevant Agreement/review/Project context | “Get experienced help” contextual cue | Open Master help → discover/select or request → review before submit | 2-4 | Real Master request is created against intended context. | Requires identity id/reference from user; Master directory absent; request machinery exposed before intention. | Phase 6 |
| HC-16 | Find the project associated with work you are already participating in. | Agreement / work item | Project context/link appears when association exists | Tap Project | 1 | Correct private Project opens. | Must go Account → Projects → search manually; association invisible. | Phase 6 |
| HC-17 | Respond to an actionable notification without unnecessary navigation where inline response is sufficient. | Notifications | Action buttons directly under notification | Tap response/action | 1 | Canonical underlying state updates or user is routed only when authority requires full context. | Every action opens another page; resolving notification substitutes for domain action; stale action accepted. | Phase 8 |
| HC-18 | Find a pending Agreement change and understand what changed before deciding. | Agreement preview/detail | “Change needs you” cue | Preview change → view diff → accept/reject | 2-3 | Human-readable diff appears before decision. | Pending change hidden in Full record; raw version/domain terminology required. | Phase 1 |
| HC-19 | See who still has not confirmed the current Agreement version. | Agreement preview/detail | People/confirmation status | People → confirmation state | 2 | Waiting participant(s) clearly identified. | Must interpret participant backend states; confirmation buried. | Phase 1 |
| HC-20 | Understand why money cannot move. | Money | “Can money move? No” plus reason cue | Tap Why? | 1 | Human-readable blocker(s) from backend preflight are shown. | Generic “not ready”; client invents reason; forces provider architecture screen. | Phase 2 |
| HC-21 | Find a Store option for something in Vision. | Vision item | “Find what it needs” cue when matchable | Find options → compare routes/offers | 2-3 | Real Store/fulfilment matches are shown with tradeoffs. | Need must be recreated manually in Store; supply-route jargon dominates. | Phase 3 |
| HC-22 | Join or respond to a Community activity. | Community | Project/activity needs and dates visible | Open activity → RSVP/volunteer | 2 | Participation state is recorded without implying material/funding obligation. | Activity is just a post; participation requirements unclear; people/help and funding blurred. | Phase 9 |
| HC-23 | Change notification quiet hours. | Notifications | Preferences tab visible | Preferences → Quiet hours → set/save | 3 | Backend quiet-hours state updates. | Hidden in Settings unrelated to notifications; time zone semantics unclear. | Phase 8 |
| HC-24 | A developer wants API credentials for a Business. | Account | Developer / Connect doorway | Developer / Connect → register/open app → issue credential | 3-4 | Credential is issued only for permitted Business identity/authority. | Developer capability placed in primary nav; authority wording implies an Organization admin can do what backend denies. | Phase 9 |
| HC-25 | A financial institution representative wants to start onboarding. | Account / appropriate institutional context | Financial Institutions doorway | Open institution onboarding → review authority requirement → submit | 3-4 | Real institution enrollment request is submitted. | No human route exists; raw API knowledge required. | Phase 7B |
| HC-26 | A member wants to find relevant learning in Skills Institute. | Community/Skills doorway | Learn / Skills cue | Search/browse → open asset/program | 2-3 | Relevant public/eligible learning content is discoverable. | No frontend route; API-only capability. | Phase 7A |

## Five-second rules

### Home / KS001
Within five seconds the person should understand:
- **What am I looking at?** A place to tell SecurePay what I am trying to make happen.
- **What needs me?** Any Agreements/invitations/problems that need attention.
- **What can I do next?** Start with KS001 or open a real attention item.

Current gap: supported “bring what you have” source types are not permanently guaranteed as an immediately obvious doorway.

### Vision
Within five seconds:
- **What am I looking at?** My place for ideas/plans I want SecurePay to remember.
- **What needs me?** Any item needing a decision/update, if relevant.
- **What can I do next?** Add an idea, find a saved idea, or find what an idea needs.

Current gap: Add/Search/working tools are not yet certified as first-use obvious.

### Agreements
Within five seconds:
- **What am I looking at?** My Agreements.
- **What needs me?** Which ones require my action.
- **What can I do next?** Find/search, preview one, or open the one needing me.

Current gap: preview behavior is missing; list-scale interaction needs certification.

### Agreement preview
Within five seconds:
- **What am I looking at?** A quick, non-editing look at one Agreement.
- **What needs me?** Status + next action.
- **What can I do next?** Review, Money, Ask KS001, or Open Agreement.

Current gap: no browse-friendly preview surface exists.

### Agreement detail
Within five seconds:
- **What am I looking at?** The living Agreement and current version/status.
- **What needs me?** Action-required change/review/milestone/problem.
- **What can I do next?** Perform the next authorised action or inspect deeper detail.

Current gap: contextually important reviews/issues can become too quiet behind progressive disclosure.

### Money
Within five seconds:
- **What am I looking at?** Money for this Agreement.
- **What needs me?** Funding/release/blocked state, if any.
- **What can I do next?** Fund, review release, or inspect why/charges/history.

Current gap: too much architecture/explanation competes with the answer.

### Store
Within five seconds:
- **What am I looking at?** My Store / what I offer and what needs attention.
- **What needs me?** Availability/offer/opportunity attention.
- **What can I do next?** Add an offer, update availability, or open a real opportunity.

Current gap: Add offer and owner-action hierarchy need stronger first-use certainty.

### Community
Within five seconds:
- **What am I looking at?** Real Projects/Activities/Circles and what people are doing.
- **What needs me?** Activity/Circle response if relevant.
- **What can I do next?** Join, respond, open a Circle, or follow a project story.

Current status: strongest current surface; primarily preserve and certify.

### Skills Institute
Within five seconds:
- **What am I looking at?** Learning/programs relevant to what I want to do.
- **What needs me?** My next learning/participation step.
- **What can I do next?** Search, start/continue a program, or open learning.

Current gap: no first-party frontend exists.

### Account
Within five seconds:
- **What am I looking at?** My identity, businesses/organizations and secondary controls.
- **What needs me?** Security/subscription/representation attention where applicable.
- **What can I do next?** Manage identity, Business/Organization, Notifications, Projects, Developer/Connect or Support.

Current status: usable, though Business/Organization language is comparatively administrative.

## Scenario certification rules

A scenario fails if any of the following is true:
- the user must know an endpoint, internal object name or architecture term;
- an action exists but has no discoverable cue;
- a first tap causes surprising full-page navigation where preview/inline action would satisfy the intent;
- a response updates only UI state rather than the canonical domain state;
- a UI pattern works for 3 records but has no coherent interaction for 20/100/1,000;
- a simplification removes an existing authority/action/detail path;
- the frontend infers authority or money state not provided by backend truth.
