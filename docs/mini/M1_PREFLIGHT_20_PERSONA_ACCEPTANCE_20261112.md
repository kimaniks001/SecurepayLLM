# SecurePay Mini — 20-Person Preflight Acceptance Gate
**12 November 2026** · **Owner request:** test approved Mini against the previously designed 20-person SecurePay Preflight group.

## Recovered canonical definition
The original October 2026 Preflight specification calls these **20 SYNTHETIC USERS**, not a group of recruited human testers. Distinct real-person user testing follows later. Preflight doctrine: **Real SecurePay, synthetic consequences.** It uses the real SecurePay UI, API, permission and Agreement rules with isolated simulated identities, Stores, messages, money providers and audit logs. The design of Mini and its established three/four starting choices must not change for testing.

Original stable roster (do not rename or silently replace):
1. **Amina** — buyer/member: search published Store and request 40 bags of cement. Check seller identity and verified current offer; never advertise fictional stock.
2. **Peter** — qualified Plug: availability + mission permission comes from the real qualification/assignment backend, not a persona badge.
3. **Wanjiku** — Master: qualification, conflict and independent review acceptance required.
4. **Kamau** — Store owner and Plug: representation rights, product catalogue, and separate role permissions.
5. **Njeri** — Business Store owner: current published stock, quote and buyer/seller agreement boundaries.
6. **Brian** — unqualified Plug: explicitly reject high-risk assignment; never silently become qualified.
7. **Mercy** — apprentice: useful guidance, no automatic professional authority or paid mentor.
8. **Joseph** — farmer/pooling: verify trip, spare capacity, location, consent and separate supporting agreement.
9. **Lucy** — Circle steward: mother collection consent and private group visibility.
10. **David** — service-business owner: scope, delivery milestones, evidence and buyer/seller acceptance.
11. **Grace** — homeowner: real Store discovery and optional service provider.
12. **Hassan** — qualified Plug currently **OFF**: cannot be assigned simply because qualified.
13. **Ruth** — accommodation/ShortStay: category-specific vetted host and actual availability.
14. **Samuel** — electrical Master: verified competence and independent evidence-based milestone review.
15. **Joan** — high-value business/finance: KSh 500,000 mother collection is still *only a proposed amount*, never valid authorisation or real payout.
16. **Kevin** — signed-in non-Trust member: deny access to another private Circle and Agreement.
17. **Esther** — invited, not yet accepted: invitation remains *pending*, even if message delivered.
18. **Daniel** — usually logged out: invitation delivery and session continuity; no automatic acceptance or new conversation.
19. **Irene** — mixed ordinary use: simple Pay/Collect must not become a mandatory fundraising investigation.
20. **George** — older, non-technical user: one useful question at a time, legible next action, no hidden commitments.

## Source test fixture now available
- `tests/fixtures/securepay-mini-preflight-20.json`: 20 original names/roles, distinct synthetic-only fixture handles, grounded Mini example, expected capability and critical authority check.
- `tests/mini-preflight-20-personas.test.mjs`: checks all 20 scenario contracts against the **existing Mini source and working local models** (Store search parser, mother collection question state machine, canonical first-party Agent client, identity/finance no-authority boundaries). These tests **do not** impersonate synthetic backend users, certify production permissions, or move test funds.
- Newly identified and fixed: Store search parser strips final question punctuation **before** deleting a named location. Example `Where can I buy 40 bags of cement near Varsityville?` must search "cement", not "cement near varsityville"; sensitive delivery wording stays out of ordinary public Store search.
- Included as an **additive focused prebuild test**, with the existing 18 Mini M1 cases and TypeScript gate. No Mini visual changes.

## Preflight real-interaction phase — NOT YET RUN
Only activate after an independently isolated Preflight deployment is verified: own database/storage/queues/provider adapters, messages, logs/audit and synthetic identity namespace; exact API + UI Git SHA, fixture/scenario/migration versions. Backend creates real Preflight sessions for Amina–George; switching a persona means a **server-authenticated synthetic identity**, never adding a `?viewAs=Brian` flag to production UI.

For each persona, run in this order:
- **Mini entry:** the person starts in the actual compact Mini; KS001 understands their words without a tutorial or another product.
- **One unfolding layer:** one relevant question/action; no kitchen-sink toolbar, fabricated Store, extra form or repeated answer.
- **Same Agreement:** query canonical source-backed slot/version; still only a draft until independently accepted.
- **Role and permissions:** correct party sees only their own Agreement/Store/Circle and cannot exceed entitlement.
- **Recovery:** reload and same conversation; network error, stale state, retry, permission rejection and 404 clearly shown.
- **Consequences:** all outside effects marked **TEST MONEY**, mock notification, simulated provider or synthetic Store. No real account number, charity invitation, rail or delivery commitment.
- **Completion/review:** clear legitimate next action and truthful status; owner rates understandability independently of HTTP/build passing.

**Critical multi-person cross-checks**, using different actual server sessions:
- Amina buyer → Njeri seller: viewed offer versus confirmed stock; separate agreement acceptance, no duplicate order.
- Lucy organiser → Joan proposed collector → George contributor: beneficiary's consent, collector's representation, permitted public disclosure, contributor updates; no permission from typed names.
- David service business → Peter qualified Plug → Wanjiku/Samuel Master: distinct duty, qualification and evidence permissions.
- Brian unauthorised Plug → mission: **deny**; Hassan qualified-but-OFF → mission: **deny**.
- Esther invited → Daniel logged out: invitation delivered / viewed / accepted are distinct statuses; must not presume acceptance.
- Kevin non-member → Lucy's private Circle: **deny**; direct auth checks on API, not just UI hiding.
- George elderly user: task success on 320–390 px screens, readable copy, tap targets, no need to memorise the UI.
- Joseph pooled trip → Kamau transport: verify capacity, itinerary, consent and changes, not auto-share private route details.
- Joan amount or Money: provider test receipt only, no false funding/release.

## Release gating
**Stage 1 — Source model and contract:** 20 distinct named scenario checks, existing Mini models and security-boundary assertions. Record precise source SHA/test output. This is *preparation*, not 20 people passing a real task.
**Stage 2 — Isolated backend Preflight:** seed all 20 synthetic people via approved test namespace and real backend auth. Run actual cross-persona Agreement/privacy tests, screenshots and logged outcomes. Not started.
**Stage 3 — Human evaluation:** separate recruited and consenting volunteers, especially older/novice traders; monitor whether Mini unfolds naturally. Not started.

**M1 cannot pass based on Stage 1.** Its live KS001 12-turn Ruiru chairs, legitimate configuration, backend continuity and independent Agree/Review still require verified execution. Never show "20/20 users passed" when only source tests ran.

## Alignment with all 22 Immutable Laws
This group particularly tests **Perception (4), Focus (5), Perspective (11), Sacrifice (13), Candor (15), Success (18), Failure (19), Hype (20)**. If George needs a training session or Irene must learn Agreement API language, Mini has failed simplicity. If a Store quote looks verified when it isn't, it has failed candor. Reuse the full law-by-law gate file; this test suite does not create a different product positioning.

**Stop conditions:** any non-isolated server, real customer person or phone/health data, genuine payment, fabricated provider/role authority, automatic acceptance, no precise state/provenance, or changes to the approved Mini design merely for testing convenience.
