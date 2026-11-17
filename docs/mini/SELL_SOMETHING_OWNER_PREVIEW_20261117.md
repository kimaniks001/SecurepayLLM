# Sell Something inside Mini — owner review

This native component is mounted from the **Sell something** entry in the isolated Mini demo. It extends the latest branch from Buy Something PR #324 and preserves its separate Money/SecureLink decisions.

- Offer composition: item/service, quantity, fixed price or quote, optional guided Describe & Present.
- Live Workspace tool family: Photos, Documents, Places, Date & Time (reuses `buildTimingProposal`), People & Invitations.
- Seller-side quiet Fair Trade examination with seller authority declaration, availability statement, image-source declaration and conservative restricted-category gate.
- In-preview image Identimark is illustrative, not a verified fingerprint or ownership claim.
- End choices: Share with buyer, Add to my store, Save for later. **No seller-side Money button.**

## Authority boundary

**DEMO_ONLY_REMOVE_BEFORE_PRODUCTION**: No backend licence, legality, source, copyright, product stock, ownership, identity or image matching is performed. Uploads stay on the device, document filenames only; seller choice has no canonical Agreement, actual SecureLink, published Store record, Money or provider authority. A local draft saves non-file text to tab sessionStorage only. Enabled only with owner-preview host and `miniTradeDemo=1`. The existing normal Mini seller path is preserved. Before real release, wire canonical source ingestion, seller eligibility, rights-to-sell evidence, image provenance, identity/representation, revised offer version checks, store publishing and communications through server gateways.

## Owner test

Open isolated Vercel preview `/mini.html?miniTradeDemo=1&sellPreview=1`. Walk example feed offer, image source unknown, suspected restricted item, document metadata, places, proposed schedule, people, and descriptions. Test all three local exit paths. Do not interpret simulated share or store as actual completion.

## No production approval

Human acceptance, API source verification, security review and production convergence remain pending.
