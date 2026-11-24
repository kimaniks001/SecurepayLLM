# Checkout by SecurePay — Business-only product boundary
**Owner decision · 24 November 2026**

The owner explicitly decided:
- **SecurePay Mini:** human-first Buy / Sell / Pay / Collect and onboarding, with Explore with your AI on its HOME. Not a merchant Checkout by SecurePay product/advertisement.
- **Living Workspace:** structured Agreement work, negotiation, obligations, evidence, Money review, and connected people. Not a merchant Checkout by SecurePay footer or merchant product.
- **SecurePay for Business:** owns merchant checkout creation, configuration, presentation and partner checkout integrations (subject to real authenticated capabilities and certified payment providers).

This boundary does **not** stop a buyer from paying using a legitimate original Agreement, and it does **not** remove the Workspace's Money or Store discovery.

## Current source verification
Inspected this repo's default Living Workspace shell:
`src/App.tsx`,
`src/components/NavBar.tsx`,
`src/components/SignedOutHome.tsx`,
`src/components/SignedInHome.tsx`,
`src/components/ConversationWorkspace.tsx`,
`src/features/workspace/WorkspaceExperience.tsx`, and
`src/features/living-workspace/Phase1LivingWorkspacePreview.tsx`.
Those inspected sources contain **no merchant footer "Checkout by SecurePay"** to remove, as of this source baseline.

Add `tests/living-workspace-business-checkout-boundary.test.mjs` to the existing `test:living-workspace` script to permanently check the entire `src/features/living-workspace` and `src/features/workspace` trees plus top-level app navigation and home. It rejects the merchant checkout imprint/label in any Workspace surfaces, but asserts the Agreement and Money tools remain present. This is a static source guard, not an actual cross-browser UI certification. Do not remove ordinary Agreement Money processing to enforce merchant product naming.

## Related original Mini code
The merchant-only imprint was visible in the standalone Mini's `MiniExperience.tsx` footer; [Mini PR #46](https://github.com/kimaniks001/mini/pull/46) removes it and returns **Explore with your AI** to Mini's homepage.

Mini still contains inherited fictional hosted Checkout demo fixtures accessed by explicit sample checkout-session routing. They are not real payments. Moving merchant checkout runtime/partner URLs to the Business application requires a separate migration and consumer-impact test; do not break existing Business demo links without verifying their dependents.

## Release boundary
Draft PR only. No production/staging alias change, real Store checkout publication, provider payment, KSNumber identity, signing, subscription or Money authority. A complete checkout product migration must be implemented and certified in **SecurePay for Business**, not silently through Mini or Living Workspace.
