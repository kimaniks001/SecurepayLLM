# SecurePay Human Experience Constitution

**Status:** Phase 1 design contract  
**Baseline:** `kimaniks001/SecurepayLLM@dfdc6bf4eaa31e96c15c330e71cb6c91ba1e8dfa`  
**Date:** 2026-10-12

## Purpose

SecurePay can be technically sophisticated without making a person operate that sophistication.

The human layer exists to help a person accomplish something in real life. The system layer exists to understand, protect, remember, verify, coordinate and govern that work. They must not be confused.

The permanent direction is:

> **Expose the outcome, not the machinery.**

and:

> **SecurePay always knows what matters next.**

A person should be able to understand what to do without having to understand why SecurePay's architecture is arranged the way it is.

## The contract

### 1. Start with human intent

The primary entry question is not “Which SecurePay product do you want?”

It is:

> **What do you want to get done?**

The product may route into Agreement, Money, Vision, Store, Community, identity, evidence or human support underneath. The person should not have to route themselves first.

### 2. Show the work, not the system around the work

The dominant visual object must be the thing the person is creating, considering or acting on.

- Agreement work → show the Agreement.
- Vision work → show the Dream/Vision.
- Money work → show what the Agreement requires financially and the next authorised action.
- Store work → show the offer/need/capability that matters.
- Community work → show the real person, Circle, project, need or opportunity that matters.
- Learning/support → show the capability/help required for the present task.

System state may support the artifact; it must not visually outrank it.

### 3. One meaningful decision at a time

SecurePay may know ten unresolved facts. The human should normally see the one materially important decision that belongs now.

Do not turn intelligence into a checklist or questionnaire.

When several independent actions are legitimately available, SecurePay may expose them as secondary choices, but one action must remain visually dominant when one is materially next.

### 4. KS001 thinks before asking

Before asking the human, KS001 must use the context SecurePay already has:

- the current conversation,
- Trade Context,
- source material,
- the current Agreement/Version,
- participant and authority state,
- evidence,
- Money state,
- approved knowledge,
- capability truth,
- prior answers,
- recorded choices,
- relevant opportunities,
- and the server-owned question/next-action projections.

If SecurePay knows it, do not ask again.

If it can safely derive it, do not make the human type it.

If it can wait, do not interrupt the current step.

### 5. Continue means “take me to what needs me”

Continue is not a route name and not “open the place I was last viewing.”

A Continue action must answer:

> **What is the most relevant unresolved human action for this work right now?**

Examples:

- settle a missing payment condition,
- respond to the other person's proposed change,
- review and sign,
- inspect completed work,
- provide requested evidence,
- fund an Agreement,
- approve a release,
- answer an invitation,
- resume an unfinished private build.

The destination is the exact unresolved action, not a generic dashboard.

### 6. Complexity is earned by need

Advanced detail is not removed. It is progressively disclosed.

A simple transaction must not inherit all of the controls required by a complex transaction.

Default visibility levels are:

- **Essential now** — required to understand or act now.
- **Contextual** — appears because the current condition makes it relevant.
- **On request** — available to inspect without interrupting progress.
- **Internal machinery** — retained by SecurePay, not presented as ordinary UX.
- **Remove** — duplicate, misleading, non-actionable or implementation-facing content.

### 7. Quiet is a feature

Whitespace and an apparently small interface are allowed.

Do not add cards, counters, explanations, tabs, badges, quick actions or navigation merely because the page looks empty.

A strong screen may contain one artifact, one sentence and one action.

### 8. Use ordinary consequence language

Prefer:

> Peter suggested KES 30,000 before starting. That differs from your agreement.

over:

> Amendment pending · version conflict · financial consequence detected.

Internal codes, lifecycle labels, architecture labels, provider names and technical states stay underneath unless required for a specialist or audit purpose.

### 9. Truth remains server-owned

Human simplicity must never become client-side guessing.

The interface may translate authoritative state into clearer words, but it must not invent:

- agreement readiness,
- financial authority,
- consent,
- participant identity,
- payment status,
- evidence state,
- review outcome,
- availability,
- eligibility,
- or next-action authority.

Where SecurePay cannot verify a fact, the interface stays honest and neutral.

### 10. Safety should feel like confidence, not paperwork

Version pinning, evidence lineage, identity checks, money guards, authority checks and review controls remain intact.

Their normal presentation should be the consequence the person needs to know, with deeper proof one tap away.

### 11. Product areas are capabilities, not compulsory destinations

Agreement, Money, Vision, Store, Community, Projects, Account and support may remain real product capabilities and specialist surfaces.

They must not require a new user to learn SecurePay's information architecture before accomplishing a task.

Primary journeys should cross capability boundaries without making the human “change departments.”

### 12. Home has two jobs

Home answers:

1. **What do you want to get done?**
2. **What needs you now?**

It is not a directory of everything SecurePay has built.

### 13. The deeper the system, the smaller the surface

Growth in backend capability should reduce, not increase, the amount the human must operate.

A new internal capability earns a permanent visible control only when a person repeatedly needs to choose it directly and cannot be served contextually.

### 14. Human assistance appears at the point of need

Plug, Master, support, Community Saver and other human-capability pathways should surface when SecurePay can explain why they help in the present situation.

Do not ask the person to understand those systems in advance merely to discover help.

### 15. The actual artifact survives every transition

Sign-in, invitation, identity linking, review, signing, Money and evidence should feel like continuation of the same work.

Do not make the person feel that they left their Agreement, Vision or task and entered a different product.

## The screen test

Before any human-facing change is accepted, answer:

1. What is this person trying to accomplish?
2. What does SecurePay already know?
3. What genuinely needs the person now?
4. What is the one most important thing to show?
5. What is the one most important action?
6. What can stay hidden?
7. What happens immediately after that action?
8. Does the person need to understand SecurePay architecture to proceed?
9. Is the real artifact/work visible?
10. Does the interaction leave the person feeling more capable?

If these answers are unclear, the experience is not ready.

## The 70% test

For each major screen:

> Could 70% of the visible interface disappear while the person still succeeds?

If yes, move it to contextual/on-request/internal visibility or remove it.

Then ask:

> Did that simplification reduce truth, safety or capability?

If no, the simpler version is preferred.

## Anti-patterns

Reject new work that:

- adds a permanent navigation item simply because a capability exists;
- duplicates state already visible in the artifact;
- shows internal lifecycle/authority terminology as ordinary product copy;
- asks for facts already available to SecurePay;
- presents multiple equal-priority CTAs when one action materially matters;
- turns KS001 into a form wizard;
- turns Home into an analytics dashboard;
- turns Money into a prerequisite topic the person must study;
- makes evidence/version/security machinery visually dominant;
- sends “Continue” to a generic landing page;
- makes a user leave the current artifact to perform a directly related action;
- treats an empty screen as unfinished merely because it is empty.

## Defensibility principle

SecurePay's visible pattern may be easy to imitate. That is acceptable.

The defensible system is the reasoning underneath: why a question is material, when it is asked, what is sufficiently agreed, what is safe to infer, who has authority, how evidence affects state, when Money may move, when a human capability is relevant and what should happen next.

> **The surface is obvious. The machinery is not.**
