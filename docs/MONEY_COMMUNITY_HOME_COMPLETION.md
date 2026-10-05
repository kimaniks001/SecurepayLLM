# Money Community Home — Completion Report

Date: 2026-10-05

## Purpose

Restore the maturity already present in SecurePay Money without returning to a screen that reads like financial definitions.

The default Money route now starts with the human trade:
- Agreements/contracts are visible immediately;
- each Agreement shows its purpose, amount and backend next action;
- the selected Agreement shows a concise "What was agreed" view;
- Payment Ready, Funding, Release and movement preflight are visible without opening technical panels;
- Agreement Money shows funded, progressed, remaining and returned values from backend positions;
- funding routes and authoritative movement economics are visible when available;
- Banks, SACCOs, MMFs and Insurance are visible as the fair-trade finance layer;
- the existing deeper Money, FX, settlement, activity and partner controls remain available under **Full money record & controls**.

## Product character

The page uses the Trust Project principle **Money follows the agreement** as its organizing idea.

The default view is designed to feel like a community financial home rather than a backend diagnostic screen:
1. the trade;
2. what was agreed;
3. the amount;
4. what happens next;
5. what the money has done;
6. the institutions that can enable fair trade.

## Authority preserved

This is frontend composition over existing SecurePay authority.

No change was made to:
- Payment Ready calculation;
- movement preflight;
- funding authority;
- payment execution;
- release authority;
- settlement;
- ledger rules;
- pricing authority;
- regulated partner truth.

No cross-currency or cross-position client total is invented.

Banks may only be shown as connected from the existing regulated-partner API. SACCO/MMF/Insurance stay visible as product categories without claiming live availability until the API can prove it.

## Files

- `src/features/money/SimpleMoneyDashboard.tsx`
- `src/features/money/MoneyExperience.tsx`
- `tests/simple-money-dashboard.test.mjs`

## Required verification

- full frontend regression;
- TypeScript typecheck;
- ESLint;
- Vite production build;
- Vision Money Gap regression.
