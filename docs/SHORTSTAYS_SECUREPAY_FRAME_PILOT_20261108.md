# ShortStays SecurePay-origin mini KS001 guest frame — staging only

This branch reuses the Day 6/7 SecurePay Embed SDK and Agent API client, without duplicating them into ShortStays or giving that product a guest possession token.

The browser model:
- ShortStays hosts the small launcher and a PUBLIC listing/draft editor. It never reads guest tokens or real SecurePay history.
- SecurePay owns the HTTPS iframe page at /embed/shortstays-mini.html, the SDK, the conversation's sessionStorage and the one-use receiver. The frame only accepts exact-parent messages from two allowlisted ShortStays owner-preview origins and checks frame source, siteId, message type, protocol and draft length. Frame CSP frame-ancestors enforces the same exact hosts at the server edge.
- The parent uses a voluntary postMessage to PREFILL an editable draft inside the frame; the SDK does not send the message. The user presses SEND inside the SecurePay-origin frame. No secret goes to a URL or into ShortStays.
- The only optional return provenance is an explicit 3–61 character PUBLIC listing slug with an SS_ prefix. Purpose is UNSPECIFIED until the user chooses HOME/WORK in the real signed-in workspace. A signed-in receiver must independently approve handoff. A return receipt is informational only, not a booking confirmation.
- This is a fixed trusted owner pilot, NOT a generic third-party widget. Backend site-owner and originating partner verification must be strengthened and certified before open merchant distribution.

**Critical API origin detail:** Day 6 server requires a real browser Origin header for public manifest GET. Same-origin GET may omit it. The iframe prototype therefore uses SecurePay-controlled separate frame/API hosts: e.g. FRAME https://test.securepay.ke and API https://sandbox.securepay.ke. The operator must actually provision these; names are not claims they run. Register siteId shortstays-ke-preview with origin equal to the FRAME host on the isolated SecurePayAPI instance, enable the exact CORS origin, owner-controlled budget, separate model test key and protected frame-ancestors CSP. Configure only disposable data and disabled money rails.

The Vercel header in this branch protects only /embed/shortstays-mini.html for the two exact owner-preview ShortStays URLs, not every SecurePay route. An independent Caddy/proxy host must enforce the same CSP. New parent host deployments need an exact allowlist review. Do not wildcard .vercel.app or .shortstays.ke.

Focused tests: node --test tests/shortstays-mini-frame.test.mjs. Then verify live HTTP response CSP, browser iframe origin, real guest manifest, exact configured site budget, actual nonproduction KS001 reply, denied wrong Origin, expired token and meter 429, user-approved return and no transfer of real payment/booking data.

**No claim of running backend, certified real guest AI, documents, bookings or payment execution.** Never merge into production from this investigation branch without the owner and security gates.
