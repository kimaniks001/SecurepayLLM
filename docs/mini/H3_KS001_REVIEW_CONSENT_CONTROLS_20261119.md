# SecurePay Mini H3 — Own permission, recorded and withdrawable

19 November 2026 · Development only · Mini phone-first

This continues the **native** Mini app, not Living Workspace, a second
help portal, or a stand-alone redesign. All H3 controls use the same
Mini brand, compact cards, answer pills, button and KS001 language.

## What the owner sees
1. Sign into the first-party Mini experience, open My Agreements and
   select a canonical version-matched legacy Review case.
2. Read submitted positions only if the H3 source service authorizes it.
3. Under the selected case, open **Your privacy choice**.
4. Choose whether to permit analysis of your own **statement text**
   OR **supporting-item metadata**. These are independent permissions.
5. Check the server-recorded current permission and count of how many
   original parties have consented. Other people's identities/details
   are not disclosed by the status.
6. Affirmatively check the statement of consent and select 24 hours or
   7 days, then **Record my permission**.
7. At any time, **Withdraw my permission**. A failed/unknown response
   prompts rechecking rather than suggesting success.

No browser role or KSNumber can impersonate another participant.
Consent is never created automatically by opening an Agreement, asking
KS001, browsing a review or submitting an unrelated message.

## Review route
`/mini.html#/preview/mini/h3` is still the dedicated native Mini
design review. It now includes a clearly **fictional** version of the
consent choice that cannot actually record anything.
The genuine authenticated source controls are separate, preview-host
gated under first-party My Agreements and disabled for demo identities.
If the H3 API is not deployed, an honest error appears.

## Certification
The Core consent journal and controller remain draft and untested
against certified PostgreSQL migration + multi-party concurrency.
A full customer-ready consent service, verified withdrawal for inactive
former parties, model processing, evidence disclosure and actual
KS001 impartial examination are **NOT** being claimed.
Production unchanged, all Money/Agreement permissions preserved.
