# Public Experience Convergence — Phase 4 — Join, signup and human invitations (UI)

**Status:** Slice 4A implemented on branch `feat/public-experience-convergence-phase4`. Draft PR. **Not merged. Not deployed.**
Business Join (4B/4C) is **blocked** (no verified represented authority). Organization Join (4D) is not approved. **No Business or Organization Join CTA exists anywhere.**
**API companion:** SecurePayAPI `docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE4_API.md` (ADR-0021).

## 1. Routes

| Hash | Surface | Notes |
| --- | --- | --- |
| `#/join` | `features/join/JoinExperience` | Live. An optional `?interest=member\|plug\|master` changes explanatory copy only. The value is a closed enum; unknown values are ignored. |
| `#/sign-up` | `features/join/SignUpExperience` | A generic identity-only signup: "This creates your SecurePay identity — your KS Number." It joins nothing. |
| `#/sign-in` | unchanged | Adds "Don't have a KS Number? Get one" → `#/sign-up`. |

The routes are parsed in `features/join/route.ts` and rendered by `AgentExperience`, like `#/sign-in`. No token or identity ever appears in a Join URL.

## 2. The Join page

- **Signed out:**
  - explains what joining means and what it is **not** (`JOIN_IS_NOT`: no Agreement; no payments, fees, bank accounts or subscriptions; not a Plug or Master);
  - shows the versioned canonical 12 Principles from `GET /community/principles/current`;
  - offers identity first: "Get my KS Number" (inline signup in the `TRUST_PROJECT_JOIN` context), "I already have a KS Number" (inline sign-in) and "Not now". There is **no Join button while signed out**.
- **Signed in:** membership comes from `/membership/me`.

  | Membership | Page shows |
  | --- | --- |
  | none / INVITED / DECLINED | An explicit, separate checkbox — "I choose to join The Trust Project under these 12 Principles." — and a Join button that stays disabled until it is ticked. INVITED names the inviter; DECLINED says calmly that joining is still possible. |
  | ACTIVE | "You're already a Member". No button. |
  | REVOKED | "Joining isn't available for this KS Number…" + Help & Support. No checkbox, no button. |

- **Join** (`features/join/controller.ts`):
  - sends the exact displayed `principlesVersion` with one `Idempotency-Key` per logical attempt;
  - an uncertain outcome (network, timeout or 5xx) keeps the same key, so a retry can never join twice;
  - a `STALE` response re-fetches the Principles, unticks the box and says the Principles changed;
  - `NOT_AVAILABLE` shows one calm, non-disclosing sentence.
- After Join: "You're a Member of The Trust Project. Nothing else changed: no Agreement, payment, subscription or capacity was created."
- **Conversation continuity** is a separate authority. It runs only **after** a successful Join: `gateway.resumableConversationId()` + `gateway.saveBuild()` (the Phase 3 claim-with-token path). Success offers "Back to your conversation". A failure never undoes membership.

## 3. Signup context

`signupView(state, context)` / `signupErrorText(error, context)` take `GENERIC`, `AGREEMENT_INVITATION` (the default, unchanged copy) or `TRUST_PROJECT_JOIN`. Each context says what it does and does **not** do. Errors stay non-enumerating.

## 4. Public shell

- `PublicNav`: **Join** (primary, `data-public-join-cta`) next to **Sign in** (secondary), on desktop and mobile. The wordmark is hidden below 400px so both fit at 320px.
- `PublicHome` chapter 12 (`data-public-section="join"`) carries the mandated copy. Its actions are "Join" and "I already have a KS Number". A footer link is also added.
- The public **For Business** section stays explanatory with **zero controls** (no Business Join).

## 5. Invitations (UR-210)

- `TrustProjectSection`:
  - is membership-aware: Join / Review invitation for non-members, INVITED and DECLINED; nothing for REVOKED; Explore Community + **Invite someone** for ACTIVE;
  - gives ACTIVE members per-capacity prompts (Member / Plug / Master), each with **Invite them**.
- `ShareInvitation`:
  - offers a WhatsApp composer link (`https://wa.me/?text=`, which reads no contacts), Share (only where `navigator.share` exists) and Copy link ("Link copied", or the link as text if the clipboard is blocked);
  - states: "Sharing only sends a link… An invitation is not a referral and earns nothing."
- Share copy is human. It makes no income, work, rank or recruitment promise.
- Community:
  - the invitation-only copy is gone;
  - non-members see "You're not a member of The Trust Project yet." + Join;
  - the invite dialog offers two choices: invite an existing KS Number (the existing server invitation) or share a Join link;
  - the one-tap `acceptInvitation` is removed. Accepting happens on the Join page under explicit versioned acceptance.
- An Agreement invitation stays separate. After confirming, the recipient sees only a quiet "You can also join The Trust Project." link, and there is no automatic membership.

## 6. Defects found in live verification (fixed)

1. **Community blank for every signed-in non-member** (pre-existing since Phase 6 Slice 2; API UR-222).
   - Cause: the API omits `status` for a non-member (`non_null` serialisation), but `toMembershipUiState` matched only `case null`. It returned `undefined`, and the render crashed.
   - Fix: an absent or unknown status fails closed to `{ kind: 'none' }`.
   - Regression test: uses the real wire shape.
2. **The signed-in Home (Workspace) Trust Project doorway had no Join action, and it treated non-members as "unknown".**
   - Fixes:
     - `WorkspaceExperience` now passes `onJoin`;
     - the membership fact maps an absent status to `null` (a known non-member) while a failed read stays `undefined`;
     - membership is re-read on leaving the Join page, so a new Member immediately sees "Trust Project member · KS…" and the Invite prompts.
3. **The share sheet was cramped in the narrow dialog.** It is now a single column.

## 7. Viewports

These were checked live with same-origin iframes at 1440/1280/1024/768/390/360/320 on `#/`, `#/join`, `#/join?interest=plug`, `#/sign-up` and `#/sign-in`:
- **No horizontal page overflow at any width.**
- The nav Join button is 44px everywhere.
- On mobile, the only elements wider than the viewport are the intended snap-scroll "Try asking" chips inside their own scroller.
- Pre-existing sub-44px controls (KS001 Send at 36px, the public "Guided by the 12 Principles" link) and a signed-in NavBar logo overlap at 768px are unchanged files, recorded as API register UR-223.

## 8. What the UI never does

- It never joins without the explicit checkbox.
- It never treats sign-in, signup, opening a page or receiving a link as acceptance.
- It never sends `interest` to the API.
- It never puts a token or identity in a Join URL.
- It shows no Business or Organization Join, and never grants Plug or Master.
- It never calls a referral API from Join or share.
- It never changes the Agreement invitation authority.
