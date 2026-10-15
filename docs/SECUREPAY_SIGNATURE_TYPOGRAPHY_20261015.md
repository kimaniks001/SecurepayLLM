# SecurePay signature typography — launch brand pass, study 1

## Why
The existing Inter + Fraunces interface is polished but increasingly generic. A distinctive product should feel human, competent and recognisable without becoming a novelty website or confusing older KS holders.

## Proposed pairing for review
1. **Afacad Flux** — daily interface voice: KS001 dialogue, controls, listings, guidance. Developed from architectural/address lettering, with broad weights and legible number forms.
2. **Bricolage Grotesque** — expressive but controlled: the KS001 name, editorial headings and meaningful result titles, never every label or a long legal paragraph.

Both are available under the SIL Open Font License; they make a recognisable combination but are **not an exclusive SecurePay typeface**. If actual exclusivity is required, commission bespoke SecurePay lettering / a custom family from a type designer and review appropriate rights.

## Scope
- CSS fonts are loaded via the same existing Google Fonts stylesheet mechanism; fallback fonts remain in place.
- **Only** the opt-in Living Workspace root receives `sp-type-signature`. The live Home and legacy UI keep Inter/Fraunces until a reviewed rollout.
- Use the canonical `securepay-wordmark-horizontal.png` in the preview header. Do not redraw or recolour the brand mark.
- Printed Agreements retain the existing Inter print rule, independent of experimentation in the preview. Monetary digits use tabular numerals.
- No action buttons, user permissions, backend data contracts, routing or money movement are changed.

## Human tests before accepting
Review in 320, 360, 390 and desktop widths, in English and Swahili, with older traders and first-time users.
Check identity and amounts: KSh 1,250, 11,000.50, KS001, Plus Codes, dates, currency, expiry, provider terms, long names.
Check font fallbacks under slow networks, accessibility at 200% zoom, high contrast and print.
Compare readability against the previous version in the actual Agreement, Store, Quick Assist and Money tasks.

## Deployment state
Design proof only on stacked branch `design/securepay-typography-signature-20261015` above draft PR #133. No merge or production change. A passing static test cannot replace visual and human review.
