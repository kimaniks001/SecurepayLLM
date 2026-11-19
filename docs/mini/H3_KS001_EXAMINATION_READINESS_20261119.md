# H3 Mini — consent-checked examination readiness

19 November 2026 · Development preview / Mini only

The previous H3 slice let original parties record or withdraw their own
permission for future KS001 review of a submitted statement or supporting-item
metadata. This slice adds one real, separately authenticated action under
**My Agreements → selected authorized Review → Your privacy choice**:

**Check if joint examination is ready**

The Mini client sends only Agreement ID, current version, selected legacy case ID,
data scope and new idempotency UUID. It does not send statements, attachments,
Money details, a browser-supplied identity or any AI prompt. The Core rechecks
all original parties' current consent with database locks and records an
immutable, privacy-minimal attempt.

On success Mini displays whether further parties need to decide, or whether
all recorded permissions are current. Even then, it truthfully says a **real
KS001 AI examination is not yet available**. It can show only source-grounded
nonbinding questions; it cannot verify evidence, change agreements, trigger
Money or book people. A failing request shows an honest error.

The real feature remains available only under the isolated native Mini
preview host and first-party authenticated Agreement. Demo identities never
receive a fake real review. The public native sample path
`mini.html#/preview/mini/h3` remains fictional and does not perform
the actual Core preflight.

The approved Mini design DNA is preserved: `mini.html` and the same
`spm-*` cards, typography, answer pills, footer, KS001 assistance and
nested My Agreements structure used by Buy, Sell, Pay and Collect.

## Release NO-GO
Core backend H3, migration, actual database tests, 3-account BOLA/revocation
tests, legal/privacy and a consented KS001 model executor remain pending.
Vercel frontend READY proves build only, not that the backend works.
No Money or production changes.
