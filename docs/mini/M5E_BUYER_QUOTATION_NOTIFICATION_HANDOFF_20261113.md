# M5E — private “new seller quotation” attention inside frozen Mini

**13 Nov 2026. Code candidate only, no build/test or live deployment claim.**

The current single KS001 AgentController and existing **My Agreements →
Review a seller quotation** remain the whole user experience. M5D already
lists quotations for the signed-in buyer. M5E adds one small **New quotations**
section above that list, backed by the real self-scoped canonical
`NotificationsGateway` rather than a second notification engine.

Mini reads `GET /api/v1/notifications/me?category=AGREEMENTS&unreadOnly=true&page=0&size=20`.
Only records with EXACT `eventKey=store.quotation_created:<UUID>`,
closed typed parsed `OPEN_STORE` action, and matching opaque UUID
`actionObjectReference` appear. Ignore unknown, malformed or other
notifications. Notification body is never treated as pricing or source
authority.

An authenticated buyer clicks Review. Mini calls the ORIGINAL buyer-scoped
`GET /api/v1/store/quotations/{quotationId}`, validates its recorded
quantity/amount/source and shows the proposal separately. Only after the
successful authorized quotation GET does Mini best-effort mark the
notification as read, via `POST /notifications/me/{id}/read`. Marking read
is not accepting, signing, funding, paying or reserving stock.

If notification delivery/read fails, original M5D **Quotations for me**
continues to work. The manual private reference input also remains.
No WhatsApp/SMS, no changes to accepted Mini layout, no second AI or checkout.

Synthetic demo mode still does NOT call the real notification/quotation
endpoints; no false acceptance status or mocked live KS001 output.

## Deferred testing at M10
Authenticated B receives event from seller A; account C doesn't. Seller
retries do not duplicate. Notification read doesn't create Agreement rows.
Seller revocation/Store updates/expiry prevent stale Agreement draft.
Switch account and reload: no prior-account quote notification persists.
Validate actions use the typed whitelist, opaque IDs cannot bypass buyer
ownership and approved M1–M5 Mini layout is unchanged. Run against the
combined isolated API/frontend build, then eligible members of the existing
20-person test group, never with real money enabled.

Dependencies: Mini #290 → this draft, API #416 → matching M5E draft.
