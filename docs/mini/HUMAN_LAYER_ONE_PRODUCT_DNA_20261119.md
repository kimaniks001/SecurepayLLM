# SecurePay Mini — one-product design DNA (Human Layer H3 convergence)

**19 November 2026 · Native Mini UX / development only**

## Actual audit

The old H3 design-review branches (`feat/mini-human-layer-h3-help-review-20261119` and H3 examination) display a separately styled `src/features/human-layer/MiniH3Review.tsx` under the general `RuntimeApp`. That looks loosely like SecurePay Mini but is not the native Mini app.

The **native Mini owner experience** is `mini.html` → `src/mini/main.tsx` → `src/mini/MiniExperience.tsx` with `src/mini/mini.css` and its `spm-*` classes. Buy, Sell and Pay share this foundation. The separate Collect C1–C8 line has related mobile colours, but is still on separate branch(es). **Do not claim full four-journey convergence until those branches are combined and examined.**

## Correction in this branch

Built `src/mini/MiniHumanHelp.tsx` **inside the real MiniExperience shell**, reusing:
- Same original SecurePay mark, `SecurePay mini` name, 'Trust is the currency' header and checkout footer
- Same 366px compact phone frame, canonical Fraunces/Inter typography, background, card border, icon pads, elevations and responsive breakpoints
- Same `spm-persona`, `spm-question`, `spm-lead`, `spm-actions`, `spm-option`, `spm-option-icon`, `spm-option-text`, `spm-primary`, `spm-secondary`, `spm-quote`, `spm-back`
- Small H3-only CSS for answer-pill selection and bounded, truthful explanation; no second root, framework, header, brand or footer
- Same onion-layered flow: **Need a hand? → context → one need → answer pills → next help option**; no required typing or technical jargon
- Permanent quiet top-level help entry in the native Mini UI, contextual to Buy, Sell, Pay, Collect, with an ordinary 'Need a hand?' link alongside Ask KS001 on the home screen
- Return to previous Mini screen. A previously opened Pay surface remains mounted so its unfinished selection is not thrown away when visiting Help. Do not let Human Layer interrupt a live KS001 session or business settings
- Actual preview route `mini.html#/preview/mini/h3` is inside Mini, **not** `/#/preview/mini/h3` (older detached demonstration) and not Living Workspace

## Safety and backend boundaries

This phase is a **native Mini UX correction**, not the H3 backend completion. No real human, Plug or Master is contacted; no complaint is created; no Money moves; no Agreement is amended; no invented party position or evidence is declared true.

The prior H3 Core PRs #509/#510 and Mini API PRs #355/#356 remain draft and separate. Their verified-source functionality must be deliberately **converged into this native Mini component and shared app identity**, not merely merged into a generic AgentExperience Help surface. The existing H2 Agreement Conversation #508/#353 also remains draft and un-certified.

## Mandatory design gate for each H4–H8

A feature may be developed in Core, but its review UI must live in the same **Mini shell and design system** used for Buy, Sell, Pay and Collect. Before signoff, test:
1. Does the person feel they are still in the same app (brand, header, navigation, cards, icons, language, footer, touch targets)?
2. Is each screen one natural next question, using answer pills/choice cards before typing?
3. Can a person ask for KS001 or a human without losing the original journey?
4. Does it preserve the same Agreement, permissions, SecureLink, Money and privacy authority with no alternative systems?
5. Is every preview fixture clearly labelled and distinct from live data? Does it use the **native Mini URL**?
6. Have the **latest** separate Buy/Sell/Pay/Collect feature branches been reconciled rather than silently regressed?

Production unchanged. Test native source checks, full Mini focused suite, TypeScript/Vite build, H3 phone acceptance, exact Vercel preview route and backend security before merge.
