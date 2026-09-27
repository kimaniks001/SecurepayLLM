# Public Experience Convergence — Phase 2 — Public Home, Visual Convergence and Customer-Language Cleanup

**Status:** implemented on `feat/public-experience-convergence-phase2` (draft PR). UI only. Not merged, not deployed.
**Contract:** `docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE1.md` (merged), with SecurePayAPI `docs/architecture/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE1_API_CONTRACT.md` and `ADR-0021` read as doctrine.

## 1. Baseline

| Repository | main | Drift |
| --- | --- | --- |
| SecurepayLLM | `cb6aa531cd4614a941c2e8b0707e190870c0975c` (merge of #57) | none |
| SecurePayAPI | `80ff7a24bd946263333cfc020dd4ac5ad0efb9bb` (merge of #261) | none — **zero changes** |

Pre-change baseline on this checkout:
- typecheck clean;
- lint 0 errors, 7 warnings;
- 1304/1304 tests;
- build OK.

## 2. Architecture implemented

```
AgentExperience            (thin wrapper: provides the public shell while nobody is signed in)
 └── AgentExperienceRouter (the existing router)
      ├── #/sign-in → NavBar(→PublicNav) + SignInExperience      (signed out only)
      ├── Store / Community / Circle / Recovery / Help …         (NavBar → PublicNav when signed out)
      └── Home
           ├── signed in  → ContinueBuildingList + SignedOutHome(SecurePayHero variant="app") + TrustProjectSection(compact)   (unchanged composition)
           └── signed out → PublicHome
                              ├── SecurePayHero variant="public"   (the same KS001 centre)
                              ├── Try asking · How SecurePay works · The Trust Project · Member, Plug and Master
                              ├── What becomes possible · Stores and Community · For Business · Fair Trade
                              └── Footer                            (no Join chapter — Phase 4)
```

- **Public shell.** `src/features/public/publicShell.ts` defines `PublicShellProvider`, `usePublicShell`, `useAppNavPadding` and chapter/composer focus helpers.
  - `NavBar` renders `PublicNav` when a public-shell value is present. Otherwise it renders the **unchanged** signed-in navigation; a test proves the markup is byte-identical to main for every signed-in view.
  - The provider sits *outside* the router, so every screen the router returns is covered without each screen knowing. A bridge object forwards to handlers the router re-binds on every render.
- **Hero extraction.** `SecurePayHero` is extracted inside `src/components/SignedOutHome.tsx`, so the byte-pinned hero, supporting copy and trust line did not move. It keeps controller wiring, conversation creation, file pickers, accept lists, photo capture and busy/disabled behaviour.
  - `SignedOutHome` (the signed-in Home's centre) composes it exactly as before.
  - `PublicHome` uses `variant="public"` (intake modes as quiet pill buttons with icons, deliberate composer shadow).
- **Sign in.** `#/sign-in` is handled *inside* `AgentExperience` (`src/features/public/signInRoute.ts` + `SignInExperience.tsx`), not as a RuntimeApp route. The in-memory conversation, sources and view therefore stay mounted.
  - The origin is kept in memory only and restored after SecurePay confirms the person.
  - A requested private area (Agreements, Projects, Account, Notifications …) is opened after sign-in.
  - The component receives only `auth` (`signIn`, `completeOtp`, `resendOtp`) and `session.setTokens`.
- **Content.** `src/features/public/publicContent.ts` is the single copy source for the public chapters and for the shared Trust Project pillars, origin and capacities (the signed-in `TrustProjectSection` reads the same data).

### Files

**New**
- `src/features/public/publicShell.ts`
- `src/features/public/PublicNav.tsx`
- `src/features/public/PublicHome.tsx`
- `src/features/public/SignInExperience.tsx`
- `src/features/public/signInRoute.ts`
- `src/features/public/publicContent.ts`
- `tests/public-experience-phase2.test.mjs`
- this document

**Changed**
- `index.html` (tab title)
- `src/index.css` (reduced motion)
- `src/components/{NavBar,SignedOutHome,TrustProjectSection,FairTradePrinciples,ConversationInput,SecureAuth,ChoiceButtons}.tsx`
- `src/features/agent/AgentExperience.tsx`
- `src/features/conversation/ConversationSurface.tsx` (composer marker for "Skip to KS001")
- `src/features/{store/StoreExperience,community/CommunityExperience,circle/CircleExperience,recovery/RecoveryExperience,support/SupportExperience}.tsx` (no bottom-nav padding in the public shell)
- `src/features/sources/{controller.ts,ui/BringPlanPanel.tsx,ui/SourceCard.tsx}`
- `src/features/{money/MoneyExperience,developer/DeveloperExperience,business/BusinessExperience,activation/ActivationExperience}.tsx` (copy only)
- Tests updated to the new contract: `agent`, `signed-in`, `sources-ui`, `mobile-viewport`, `life-business`, `ui-phase2`, `ui-phase7-trust-project`

**Not touched**
- `RuntimeApp.tsx` (test-proven)
- Activation authority
- Every gateway and API client
- SecurePayAPI

## 3. Public navigation

| Viewport | Layout |
| --- | --- |
| Desktop | brand · How it works · The Trust Project · For Business · Sign in |
| Mobile | brand · Sign in · menu button, with a top sheet holding the three chapter links. No bottom navigation, and no `pb-16` reserve (Home and the public-reachable Store, Community, Circle, Recovery and Help screens). |

- **Menu.** It has `aria-expanded`, `aria-controls` and a named trigger.
  - Focus moves into the sheet and is trapped there. Escape closes it and returns focus to the trigger.
  - Tapping outside closes it.
  - The backdrop is rendered outside the blurred header (see §9).
- **Chapter links.** A link finds `[data-public-section] h2`, focuses it with `preventScroll`, then scrolls. They never touch `location.hash`, so there are no router collisions.
  - From another screen (e.g. Store), they return to the public Home first and then focus the chapter.
- **Skip link.** "Skip to KS001" is the first focusable element and focuses the visible KS001 composer.
- **Join.** There is none anywhere: no nav item, hero CTA, chapter, `#/join` route or placeholder (tested).

## 4. Home chapters

| # | Chapter | Implemented |
| --- | --- | --- |
| 1 | Header | `PublicNav` |
| 2–3 | Hero + intake | `SecurePayHero variant="public"`: lockup, exact headline, supporting copy and trust line; composer with `shadow-deliberate`; Bring your plan / Give me a document / Show me as 44 px pill buttons; Fair Trade affordance. `BringPlanPanel` opens right under the intake. |
| 4 | Try asking | The eight contract prompts. Each calls the existing `onStart(prompt)`. Desktop wraps; mobile is one row that scrolls inside its own container. |
| 5 | How SecurePay works | Three numbered steps (Fraunces numerals, no cards), the attachment truth line, and **Start with KS001** (focuses the composer). First soft curved transition. |
| 6 | The Trust Project | "The Trust Project is powered by SecurePay. Your KS Number is your identity across both." Pillars as quiet left-ruled items; "How this started" (existing origin); Read the 12 Principles. No counts or badges, and no Organization action. |
| 7 | Member, Plug and Master | Three identical cards (the same classes, tested): line, description, and a separated boundary line. "Side by side, never ranks." People and businesses belong; Plugs and Masters are individual people. Second soft curved transition. |
| 8 | What becomes possible | Six unnamed, non-testimonial possibilities in a quiet grid. |
| 9 | Stores and Community | Static cards. **Browse Stores** opens the existing real Store (user-initiated `GET /api/v1/stores/search`). Community is informational only, with no Join CTA and no private content. |
| 10 | For Business | Primary copy, three truthful points, "People always sign in as themselves. An authorised person acts for the business." **Informational only**: a setup CTA would lead to the current Business onboarding dead end (API UR-219). |
| 11 | Fair Trade | "Guided by the 12 Principles of Fair Trade", the disclaimer, and **Read the 12 Principles** (the canonical `FairTradePrinciplesPanel` / `FAIR_TRADE_PRINCIPLES`). |
| 12 | Join | **Not rendered** (Phase 4A). |
| 13 | Footer | Sign in · For Business · The 12 Principles · Help (the existing signed-out Help) · Trouble signing in? Recover your account. No Terms or Privacy links, because no such pages exist. |

## 5. Visual system

- **Depth.** Chapters alternate between `cream-100` and `cream-50`.
  - The hero and Fair Trade chapters carry the existing `bg-ks001-surface` forest light. It is not mutated, and there are no new colours.
  - Two soft curved transitions (`rounded-t-[2.5rem]`, overlapping by 2–2.5 rem, with a faint upward forest shadow).
- **Surfaces.** Only the capacity and Stores/Community cards are raised (`shadow-soft`, white, cream border). Everything else is chapter-level composition.
  - Menus, auth and the Bring-your-plan panel are `shadow-lifted`, and the composer is `shadow-deliberate`.
  - There is no card-in-card.
- **Type.**
  - Existing Fraunces `h1`.
  - Chapter `h2` `font-display text-2xl md:text-4xl tracking-tight text-forest-800`, with eyebrows in forest-600 uppercase.
  - Body `0.95rem` `text-sand-700`. Public text never uses `sand-400/500` (tested).
- **Mark.** Used twice: as the Trust Project eyebrow motif and above Fair Trade.
- **Motion.** Existing quiet fade-ins only.
  - A global `prefers-reduced-motion` rule turns animation, transitions and smooth scrolling off.
  - The chapter focus helpers use instant scrolling under reduced motion.

## 6. Customer-language cleanup (Phase 1 register rows owned by Phase 2)

| Where | Before | After |
| --- | --- | --- |
| BringPlanPanel button | Read into BUILD | Add to this conversation |
| BringPlanPanel helper | …read the useful parts into BUILD as suggestions. | …pick out useful details as suggestions for you to check. |
| SourceCard | Reading this into BUILD… | Reading this… |
| SourceCard | N useful details added to BUILD | N details found to check |
| SourceCard | Nothing from this reached BUILD yet | Nothing useful found in this yet |
| sources controller error | …added to your agreement yet. | …added to this conversation yet. |
| Money | The backend derives your identity and KSNumber -- … | SecurePay already knows who you are — just tell it where you want to be paid. |
| Developer / Connect | Only real, backend-verified capability is shown here. | Only what's available to your Business is shown here. |
| Business role management | "SecurePay's backend has real maker-checker… participant-facing contract…" | Assigning roles to other members isn't available here yet. |
| Activation fallback | This application does not recognize the backend's reported next action… | SecurePay has a next step this screen can't show yet. Check again, or contact support. |
| Signed-out private areas | Sign in through "Review this" to view your … (a dead end on Home) | The public Sign in route, then the requested area |
| Router fallback | This area is not available yet. … | That isn't available here. You can keep talking with KS001. |
| Trust Project Plug | referral-led "Connect useful people…" | The Phase 1 §12 contract (practical help; income never guaranteed; an invitation is not a referral and recruiting members earns nothing automatically; no authority). Final wording in §12. |
| Fair Trade affordance | Guided by the 12 principles of fair trade (sand-500) | Guided by the 12 Principles of Fair Trade (sand-700) |
| Tab title | SecurePay — What are you trying to make happen? | SecurePay — Bring the plan. Leave with an agreement. |

**Deliberately not changed:**
- **Business role management.** The mandate's suggested second sentence, "You can request a role for yourself", is omitted. The self-request gateway method exists, but no screen exposes it, so the sentence would be an unsupported promise.
- **The Business activation helper (register row 18a).** It is deferred to Phase 4B, because current backend truth still requires the legacy bootstrap.
- **`signupErrorText`.** It is not refactored, since no Phase 2 flow needed it (Phase 4).

## 7. Accessibility (WCAG 2.2 AA)

- **Headings.** One `h1` per page and semantic `h2` chapters with no level skips (tested). Anchor navigation focuses the heading.
- **Keyboard.** A skip link, and a menu with ARIA state, a focus trap, Escape to close and focus return.
- **Names.**
  - The composer is "Message KS001" with a "Send" button.
  - The file-picker buttons say that they open a picker: "Give me a document — choose a file", "Show me — take or choose a photo".
- **SecureAuth (every auth surface).**
  - Labels are tied to their inputs.
  - Errors are linked with `aria-describedby`, marked `aria-invalid` and announced with `role="alert"`, at `ember-700` contrast.
  - Inputs show a focus-within ring. The OTP field keeps `inputMode="numeric"` and `autocomplete="one-time-code"`.
  - On the Sign in page, Enter submits.
- **ChoiceButtons.** They get a focus-visible ring, `type="button"`, and a 44 px minimum target (`inline-flex min-h-11 items-center`; final correction, §12).
- **Reduced motion.** It is honoured everywhere. `lang="en"` is kept.
- **Remaining:**
  - SecureAuth has no password show/hide, because it never had one.
  - The signed-in mobile bottom-nav labels stay `sand-400`, because the signed-in NavBar was kept unchanged by mandate.

## 8. Shared-component impact on signed-in surfaces

| Change | Signed-in effect |
| --- | --- |
| Fair Trade affordance capitalisation and colour | Visible on the signed-in Homes (intended, AA) |
| Trust line and "Ready to use…" `sand-500 → sand-600` | Signed-in Home (intended, AA) |
| TrustProjectSection capacities copy and "Members belong. Plugs help. Masters bring experience." | Compact doorway, when expanded (intended contract copy) |
| Source copy | Signed-in conversations (intended) |
| SecureAuth, ConversationInput | Accessibility attributes and focus rings only; no layout change |
| ChoiceButtons | 44 px minimum height on every choice (chat, auth, handoff, recipient); still compact pills (§12) |
| Global reduced-motion rule | All screens, only when the person asks for reduced motion |
| Signed-in NavBar | **Unchanged**: byte-identical markup (tested) |

## 9. Tests

| Command | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 7 warnings (identical to baseline) |
| `node --test tests/*.test.mjs` | **1331/1331** (baseline 1304 + 27 new in `tests/public-experience-phase2.test.mjs`) |
| `npm run build` | OK (the existing chunk-size notice only) |

New coverage:
- public nav contents;
- signed-in NavBar byte identity;
- menu ARIA, focus trap and backdrop placement;
- chapter focus without `location.hash`;
- the Join gate (no Join, no "coming soon", no `#/join`, no Join endpoint);
- the exact hero copy;
- chapter order and heading levels;
- the prompts;
- equal capacity cards and no Organization action;
- no counts, testimonials or live-data loading in public components;
- no fixture imports;
- the Store being user-initiated;
- truthful For Business copy;
- public-only chapters absent from the signed-in Home;
- `#/sign-in` parsing;
- the Sign in page (labels, authentication only);
- dead-end notices removed;
- RuntimeApp unchanged and Activation still reachable when signed in;
- BUILD and "backend" copy removed;
- the canonical Fair Trade source and contrast;
- reduced motion;
- accessible names and OTP attributes;
- intake accept lists and photo capture in both variants;
- public-shell padding.

## 10. Browser verification (real SecurePayAPI, sandbox, model provider `none`)

The backend was SecurePayAPI main `80ff7a24` in local sandbox mode (PostgreSQL + Redis), with the Vite dev server in real mode through the existing uncommitted local proxy.

| Journey | Result |
| --- | --- |
| A — first visit | Public nav, KS001 hero, all chapters, no Join, no app-nav leak, no build copy. |
| B — start with KS001 | Typed request → the same conversation view with the real (deterministic) KS001 reply; the public nav stays. |
| C — bring a plan | Real pasted-text source created. With provider `none` it truthfully fails to read; no BUILD wording in the UI. |
| D — document / photo | Real document upload through the hidden input; accept lists and `capture="environment"` unchanged. |
| E — sign in | Home → Sign in → KS Number + password → OTP → signed-in Home with app nav. Only `auth/login`, `auth/complete` and the existing signed-in Home reads (`saved-builds`, `membership/me`, `circle/me`); **no subscription, activation, funding or Join call**. Signing in from the Store returned to the Store. A signed-out conversation was still there after signing in. |
| F — chapter navigation | Desktop links and the mobile menu focus the correct chapter heading (it lands ~180 px from the top, under the header); `location.hash` is unchanged. This also works from the Store. |
| G — Store | Browse Stores → the real Store (one `/stores/search`), public nav, no inserted content. |
| H — signed-in regression | Home, Agreements (workspace), Money (existing notice), Store, Community and Account render with the unchanged app nav and no public chapters. |

**Widths:**
- 1440, 1280, 1024 and 768 were checked by resizing the real window.
- 390, 360 and 320 were checked with the same-document iframe technique (the window has a ~606 px resize floor here).
- At every width: no horizontal page overflow, the composer fits, the brand is clear, the prompt row scrolls internally, the menu is usable, and the Sign in page fits (checked at 320).

**Defects found in the browser and fixed:**
1. The capacity cards were visibly unequal. Each capacity now has a description plus a separated boundary line.
2. At 768 the three capacity columns were cramped; they now use three columns only from `lg`.
3. The footer's first column wrapped too narrowly.
4. The mobile menu's tap-outside backdrop had **zero height**. The header's `backdrop-blur` makes it the containing block for `fixed` children, so the backdrop now renders outside the header, with a regression test.
5. Chapter focus cancelled Chrome's smooth scroll when called after it. The helper now focuses first, then scrolls.

**Environment note.** Under automation the tab reports `visibilityState: hidden`, and Chrome does not animate smooth scrolling in hidden tabs. Scroll verification therefore used the reduced-motion (instant) path, which is the same code.

## 11. Findings deferred (not fixed here)


- **Backend source failure text.** It reads "SecurePay received the file, but couldn't read it right now. Nothing from it has been added to your **agreement** yet." It comes from SecurePayAPI (`AgentSourceIngestionService`) and is rendered as returned, so it overstates the stage for a pasted plan too. **Phase 3** (source convergence) should change it in the API.
- **Phase 3:**
  - source convergence and new source kinds (XLSX, AUDIO, LINK, PLACE);
  - the anonymous conversation access token (UR-203/216);
  - anonymous rate limits (UR-204).
- **Phase 4:**
  - individual Join (4A) and switching the Join CTA and ch. 12 live;
  - Business onboarding / represented authority (4B, UR-219);
  - Business Join (4C, UR-218);
  - Organization KS only if approved (4D, UR-220);
  - the signup error context;
  - the Community "invitation-based" copy;
  - the Business activation helper copy.

## 12. Final correction pass (after architectural review)

Scope: exactly four review findings. The public shell, sign-in, PublicHome, the Join gate, Store navigation and Business information architecture are unchanged.

### 12.1 ChoiceButtons — 44 px targets

- **Change:** each choice gets `inline-flex min-h-11 items-center`, so the effective height is **44 px**.
- **Unchanged:** the pill shape, wrapping, primary/secondary styling, focus ring, active scale, text size and click behaviour.
- **Measured in the real KS001 conversation** ("Save for later" → the conversation's sign-in card): 44 px at 1440, 390, 360 and 320.
  - At 320 the two choices wrap onto two lines cleanly, with no page overflow.
  - They still read as compact conversational pills, not CTAs.

### 12.2 Plug wording

| | Wording |
| --- | --- |
| Before | "Paid help is agreed separately. Income is never guaranteed, inviting people earns nothing, and helping never gives a Plug authority over anyone’s agreement or money." |
| After | "Paid help is agreed separately. Income is never guaranteed. An invitation is not a referral, and recruiting members earns nothing automatically. Helping never gives a Plug authority over anyone’s agreement or money." |

- **Why:** a Trust Project membership invitation is not a qualifying commercial referral. The blanket "inviting people earns nothing" could be read as denying the backend-authoritative Agreement Plug attribution and Lifetime Share model.
- The new wording promises nothing and states no percentage.
- `CAPACITIES` is shared, so the change renders on both the public Home and the signed-in Trust Project doorway (tested on both).

### 12.3 Store heading

| | Heading |
| --- | --- |
| Before | "A Store for every member" |
| After | "Your KS Store" |

The body is unchanged ("Your KS identity gives you a digital Store while your SecurePay identity is active…"). The Store follows the KS identity, never Trust Project membership (tested).

### 12.4 Signed-out public-route contrast audit

**Method.** An in-page auditor walked every visible text node. For each it computed the rendered text colour against the resolved background, and applied AA thresholds (4.5:1 normal; 3:1 for ≥24 px or ≥18.66 px bold).
- It ran on the real signed-out render of each screen against a live SecurePayAPI, at 1440, 768, 390 and 320.
- Community and Circle have no signed-out entry point in the Phase 2 public shell, so they were opened through the router's own `navigateTo` for the audit only. They can still render signed out, for example when a session ends mid-visit.

**Failures found, and the fix** (all promoted to `sand-600`: 4.53:1 on cream-100, 4.85:1 on white):

| Screen | Failing text (before) | Fixed in |
| --- | --- | --- |
| Help | section labels "What do you need help with?", "Talking to a person" (`sand-500`, 3.27:1) | `SupportView` `Label` |
| Recovery | "Back to sign in", field labels, the privacy and sign-out notes (`sand-500`, 3.05–3.27:1) | every step of `RecoveryExperience` (all signed-out states) |
| Sign in, one-time-code step | KS Number chip (`sand-500`, 3.18:1) | `SecureAuth` identity line |
| Store browse | intro, "Offers", "For traders", the Ask-SecurePay hint (`sand-400/500`, 2.1–3.1:1) | `StoreHome` |
| Store result cards | kind label, `· KS…`, place, "No price listed" | `ResultCard` |
| Store offer detail | section labels, availability, empty-scope lines, "No photos available", the metadata line, back/store/ask links (`sand-400/500`, 2.07–3.27:1) | `OfferDetail` (text only) |
| Community | "A community of people choosing to trade fairly." (3.05:1) | `CommunityExperience` banner |
| Community | page intro, entry-card helper lines, section labels, loading/error lines, people/business lines | `CommunityHome` (text only) |
| Community | store-offer card body and metadata, status pill | `CommunityObjectCard` |
| Circle (signed out) | none: it is the SecureAuth sign-in gate (covered by the SecureAuth fix) | — |
| Public Home | none | — |

**After the fix:** zero AA failures on every audited screen at 1440, 768, 390 and 320.

**Deliberately retained `sand-400/500`:**
- Decorative icons (`<svg>`: search, map pin, clock, shield, file, users, chevrons, dots).
- Input `placeholder:` styling.
- Help's context-only labels ("What is needed", "From Formal Review", "From Money"), which render only for a signed-in Help context.
- Every signed-in-only screen, and the signed-in mobile bottom navigation.
- Circle and Community membership actions (OPEN join, REQUEST_TO_JOIN, invitation acceptance) were not touched. "Sign in to see what the community is sharing." was already `forest-800` on white. The invitation-based membership copy stays until Phase 4.

**Bolt pin.** `CommunityObjectCard` is byte-pinned to the Bolt reference in `tests/community-circles.test.mjs` (T1). The test now permits exactly the three AA-promoted class strings and still requires everything else to be byte-identical.

### 12.5 Tests and validation

- New tests in `tests/public-experience-phase2.test.mjs`:
  - ChoiceButtons 44 px and preserved styling;
  - the Plug invitation ≠ referral wording, on both renders;
  - the Store heading;
  - rendered-state contrast checks for signed-out Help, Sign in (both steps), Store browse, result cards, every offer detail, and Community (home, cards, banner);
  - a Recovery state-scoped check;
  - Circle Join authority untouched.
- Updated: `ui-phase7-trust-project` and `community-circles` T1.
- Totals: 1340/1340 tests; typecheck clean; lint 0 errors / 7 warnings (baseline); build OK.

## 13. Public shell closure

- **Signed-out Help now inherits `PublicNav`.**
  - Before, `SupportExperience` passed its `NavBar` only when signed in, so signed-out Help, reached from the public Home footer, had no navigation at all.
  - It now always passes `<NavBar …/>`. Inside the public shell that renders `PublicNav`; signed in, it is the unchanged app navigation.
  - Help never chooses a navigation itself, and does not import `PublicNav` (tested).
- **Present-tense Help copy.**
  - Before: "Human support requests are not yet available from this screen. SecurePay can still help you inspect the Agreement, Money and formal Review state here."
  - After: "This Help page doesn’t create a support request or contact a person. Use the options above, or ask KS001 for the next step."
  - The section label moved from "Talking to a person" to "Getting more help".
  - No ticket, case, hours, live chat or escalation is claimed.
  - The separate, signed-in-only Agreement Support tab keeps its own inline sentence; it is outside this pass.
- **Contextual network-activity sign-in.**
  - Before: "Sign in to review this".
  - After: "Sign in to see your network activity", with the reason "SecurePay needs to confirm who you are before showing your network activity."
  - It uses the same identity controller and `SecureAuth`, and signed-in loading of the network activity is unchanged.
- **Verified in the browser** (real backend):
  - Home → Help shows the public nav at 1440, a true 768 (desktop nav), 390 and 320 (mobile bar and menu), with no bottom navigation and no overflow.
  - From Help, How it works, The Trust Project and For Business return to Home and focus their chapter. Sign in → Cancel returns to Help, and Back returns to Home.
  - The signed-out network-activity gate shows the contextual title, and signing in through it loads the network activity.
  - Signed-in Help keeps the app navigation and all signed-in actions.
- **Scope held:**
  - No authority or backend call changed.
  - No support-case behaviour was added.
  - Circle and Community membership are untouched.
  - No Trust Project Join.
  - SecurePayAPI unchanged.
- **Tests:** four new checks in `tests/public-experience-phase2.test.mjs`:
  - signed-out Help renders the public nav;
  - signed-in Help keeps the app nav and its actions;
  - Help copy is present-tense, with no fake capability;
  - the contextual network-activity sign-in.

  `tests/ui-phase10.test.mjs` is updated to the new wording, and its no-ticket and no-escalation guards are kept.

## 14. Agreement Support copy consistency

- **Real Agreement Support now follows the same present-tense support doctrine as Help & Support.**
  - Before: "Human support — Human support requests are not yet available from this screen. SecurePay can still help you inspect the Agreement, Money and formal Review state here."
  - After: "Need more help? — Nothing here creates a support request or contacts a person. Use Help & Support for the available ways to inspect this Agreement, Money and formal Reviews, or ask KS001."
  - It complements the Help page wording rather than repeating it.
- **No support authority was added:** no API client, support-case, ticket, staff Support Context, escalation or persistence (tested).
- **AA text.**
  - The new line is `text-sand-600` (4.85:1 on white).
  - The rendered audit of the real card also found the "Support" label and five action helper lines at 3.27:1; they are promoted to `sand-600`.
  - Zero failures remain at 1440, 768, 390 and 320 (signed in, real Agreement → Support).
- **The fixture-only branch is retained unchanged.** It shows "Request human support / Coming soon" and "Raise an issue", and renders only when `reviewPanel` is absent.
  - The only production caller, `WorkspaceExperience`, always passes `reviewPanel`.
  - The only other caller, `src/App.tsx`, is the fixture App, loaded only in DEV fixture mode; fixture mode throws in production.
  - This is tested, and the branch stays pinned by `ui-phase10`.
- **Copy search.** "not yet available from this screen", "Human support requests are not yet available", "Request human support" and "Coming soon" appear in production source only in that fixture-only branch. Other hits are tests and docs.
