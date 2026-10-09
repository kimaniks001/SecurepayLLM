# SecurePay Human Convergence — Phase 0 Baseline Report

Date: 2026-10-06

## Scope and discipline

This report is documentation only. No product UI, API, feature, route, gateway or authority contract was changed. No merge or deployment was performed.

## Current main heads inspected

- SecurepayLLM: `1929b96eda3f99cfc8b0b39d6ec5479a7a8894e8`
- SecurePayAPI: `8a6270de591c49c8a843944904515b254ba20df1`

These are the same heads used by the earlier Human Visibility Audit. Therefore the earlier audit is not stale because of branch drift; Phase 0 verifies and normalizes it against current source.

## Primary frontend architecture

### AppView / first-party product destinations

Current `AppView` values in `src/types.ts`:

`signed-out`, `signed-in`, `conversation`, `agreements`, `agreement-detail`, `dispute`, `agreement-builder`, `money`, `store`, `community`, `circle`, `ecosystem`, `projects`, `vision-board`, `account`, `settings`, `recovery`, `business`, `developer`, `notifications`, `support`.

Additional RuntimeApp route seams exist for invitation links, invitation inbox, Store offer links, activation, Money, Money Operations, SecureLink, Trust Project and other first-party deep links.

### Major human-facing feature modules inspected

- KS001 / Agent: `src/features/agent`, `src/features/conversation`, `src/features/entry`, `src/features/formation`, `src/features/handoff`, `src/features/instruments`
- Agreements: `src/features/workspace`, `src/components/Agreement*`, amendments/review/execution/invitations
- Money: `src/features/money`, `src/components/Money*`
- Vision: `src/features/visionboard`
- Store: `src/features/store`, `src/components/Store*`
- Community / Circles: `src/features/community`, `src/features/circle`
- Plug / ecosystem: `src/features/ecosystem`, Market Network gateway
- Master: `src/features/master`
- Projects: `src/features/projects`
- Notifications: `src/features/notifications`
- Account / Settings / Business / Organization: `src/features/account`, `settings`, `business`
- Developer / Connect: `src/features/developer`
- Financial Institutions: gateway only, no dedicated feature module
- Skills Institute: no frontend feature module or gateway in `createSecurePayApi()`

## API gateway coverage verified in SecurepayLLM

`createSecurePayApi()` currently exposes:

- agent
- auth
- agreements
- money
- store
- fulfilmentNeeds
- sharedFulfilment
- circle
- community
- discovery
- master
- marketNetwork
- referral
- subscription
- settlementDestinations
- financialPartners
- moneyAuthority
- moneySession
- paymentIntent
- paymentRelease
- agreementReview
- moneyOperations
- currencyCapability
- fxApplication
- regulatedAccounts
- businessCurrencyCapability
- businessFxApplication
- projects
- visionBoard
- visionDreams
- settings
- notifications
- business
- organization
- authorization
- developer
- moneySnapshot
- financialInstitutions

RuntimeApp session-refresh wiring confirms active first-party frontend use of the core Agent, Agreements, Money, Store, fulfilment, Circle/Community, Master/Market Network, Projects, Vision, Notifications, Business/Organization and Developer gateways.

## Backend capability areas inspected directly

SecurePayAPI current source contains dedicated controllers/services for:

- Agent conversations, source artifacts, Agreement formation/handoff and Agreement workspace access
- Agreement lifecycle, obligations, evidence, versions, invitations, Plug attribution, source provenance, calendar, public locators/SecureLink, review/dispute
- Agreement Money status/snapshot, funding quotes, payment readiness, payment intent, payment release, settlement destinations, Money sessions and operations
- Store, fulfilment and Mini Agreement review
- Community, Circles and coordination prompts
- Master and Market Network
- Projects
- Notification inbox and quiet hours
- Business / Organization / authorization
- Developer applications, credentials, webhooks and SecureCode
- Financial institution enrollment and capability applications
- Skills Institute authoring, awareness, indexing, learning, participation, Master backing, project learning, project spaces, publishing and knowledge candidates

## Current human-facing entry points

Primary signed-in mobile hierarchy after the Masterpiece merge:

- Home
- Vision
- Agreements
- Store
- Community

Account and Notifications remain available from the mobile top bar. Money is intentionally contextual and is expected to follow an Agreement rather than function as an isolated mobile-primary destination.

Secondary human entry points include:

- Account → Business / Organizations
- Account → Projects
- Account → Developer / Connect
- Account → Help & Support
- Community → Circles, Projects, events, opportunities and story surfaces
- Ecosystem / Help → Plug and Master pathways
- Agreement → Money, reviews/support, documents, calendar, people, milestones and deeper record
- external SecureLink / invitation / Store-offer deep links

## Comparison with the earlier Human Visibility Audit

The earlier audit used the same current main heads. Its major findings remain supported:

1. KS001 has richer ingestion and formation capability than the signed-in Home makes immediately obvious.
2. Vision has substantial backend/frontend capability, but first-use working tools are not all obvious from the landing experience.
3. Agreements have rich detail and search/action authority, but list browsing still lacks the agreed quick-preview interaction.
4. Agreement detail uses progressive disclosure well, but contextually important review/support actions can become too quiet.
5. Money has excellent backend truth but still over-exposes architecture/explanation relative to the person's immediate question.
6. Money Agreement selection is technically paginated but visually uses cards in a pattern that does not scale naturally to 100–1,000 records.
7. Store is mostly functional; owner actions need stronger first-use prominence.
8. Community/Circles is currently the strongest human-facing domain.
9. Plug, Master and Projects are real but buried relative to the user's work context.
10. Skills Institute is a major backend world with no first-party human frontend exposure.
11. Financial Institutions has a frontend gateway but no dedicated human experience.
12. Notifications exist, including quiet-hours API and Circle coordination, but action-by-action inline-vs-navigation behavior still needs Phase 8 review.
13. Business/Organization is available but more administrative than the simpler life-side language.
14. Developer / Connect is appropriately secondary in Account and should remain so.

## Important baseline conclusion

The current problem is not lack of backend capability.

The primary Phase 0 finding is a visibility/interaction mismatch:

> SecurePay frequently knows enough to help, but the human path to seeing, understanding, previewing or acting on that capability is inconsistent.

The permanent contract for later phases is therefore:

**SEE → UNDERSTAND → PREVIEW → ACT ONLY WHEN YOU CHOOSE → DETAIL ONLY WHEN YOU ASK**
