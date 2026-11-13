# Gate 8 Mini — Agreement addendum signatures for revised deposit/milestone plans

**State:** source-only draft, stacked on Mini #304 and API new Gate 8 addendum candidate. Not built, run, tested, merged or deployed; not a payment rail.

Mini's existing **My Agreements → Work evidence → Review charge, deposit and milestones** retains the frozen original Mini design. Only authenticated first-party actors on explicitly isolated staging can see it, and only after a real independently confirmed effective measured quantity.

## User actions

After the original work is confirmed, the reporter proposes a BILL_REVIEW_ONLY. The beneficiary separately accepts the exact charge. Reporter then allocates an optional deposit plus evidence-bound milestones exactly equal to that bill, and beneficiary independently accepts the plan.

**That earlier plan review does not authorize money or establish canonical Agreement consent.**

In the SAME nested Mini tool:
1. Reporter explicitly opens an **Agreement-linked plan addendum** for the accepted latest payment plan and original canonical Agreement version.
2. BOTH actual Agreement parties must individually ACCEPT or REJECT the EXACT addendum (their own KS identities, no self-signing for the other party). Each is a separate user action with an immutable audit decision and outbox event.
3. The beneficiary seals the Agreement addendum after every currently established party has accepted and freshly confirmed the current canonical Agreement version. This preserves original work reports/evidence/confirmed quantity and cannot change the rate, price or work.
4. Before ANY funds have been received or entered movement, the parties may propose a NEW plan revision (e.g. different deposit allocation), preserving the old plan and signatures. New revision requires new beneficiary review and entirely fresh addendum signatures. Once money is received/in motion, all financial-term changes are refused.
5. All addenda remain **AGREEMENT_ADDENDUM_NONPAYABLE**. No M-Pesa push, Choice/PesaLink attempt, bank escrow, invoice, settlement, deposit receipt or release is created.

Mini displays role-specific buttons only after the authoritative API refresh: **Ask parties to sign**, **Accept/Reject**, **Beneficiary seal**, or **Change planned deposit or milestones**. Refresh/error paths block uncertain repeated writes; no silent confirmation.

## Scope and release boundaries

The existing canonical evidence/verified-bill read APIs only expose a private work session to its reporter and beneficiary. The first addendum therefore deliberately supports exactly **two established Agreement work parties** and must FAIL CLOSED for multi-party/group Agreements; a future group consent adaptation must resolve privacy-safe multi-party work access first.

Physical time/distance measurement confidence is separate from an authenticated human approval of a photograph. The production readiness gate must not call a self-reported GPS reading an independently calibrated measurement.

The API outbox records proposed, reviewed and sealed Agreement-addendum events. External delivery by WhatsApp/push/email is NOT implied by recording an event and remains part of later E10 notifications integration.

All formal Java/Postgres/Flyway, identity, Money, provider and cross-repo tests remain later in the owner-approved certification stage. The current GitHub draft is **not** a production deployment.
