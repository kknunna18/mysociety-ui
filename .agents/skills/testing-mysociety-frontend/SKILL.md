---
name: testing-mysociety-frontend
description: How to run and end-to-end test the mysociety-frontend React/Vite SPA against its in-memory mock API.
---

# Testing mysociety-frontend

## Run it
```bash
cd mysociety-frontend && npm install && npm run dev   # http://localhost:5173
```
Node 20.x is fine with Vite 6. No backend or secrets are needed: `VITE_USE_MOCK_API`
defaults to `true` (see `src/api/client.ts` — `isMockApiEnabled()` is true unless the var
is literally `"false"`), so every call is served by `src/mocks/mockApi.ts`.
The sidebar shows "Mock API enabled" when the mock is active — use that as a quick check.

## Logins (mock only)
- `admin@mysociety.test` / `admin123` (ADMIN) — login form is prefilled with this pair
- `resident@mysociety.test` / `resident123` (RESIDENT)
- `security@mysociety.test` / `security123` (SECURITY)

## Key behaviours worth asserting
Expected values are derivable from the seed in `src/mocks/data.ts`; recompute them if the
seed changes rather than hardcoding.
- Dashboard KPIs come from `mockApi.getSummary()`; with the stock seed they are
  3 / 2 / ₹11,500 / ₹6,200 / 2 / 2.
- Error paths that ARE reachable from the UI: duplicate active resident per unit
  (`Unit X already has an active resident`), overlapping facility booking
  (`<Facility> is already booked for <slot> on <date>`), wrong password
  (`Invalid email or password`), RESIDENT on `/audit`
  (`Your role (RESIDENT) cannot access this page.`).
- Error paths that are NOT reachable from the UI: `recordPayment` 409 "already paid"
  (BillingPage hides the pay button and renders "Settled" once status is PAID) and
  `checkInVisitor` 409. Report these as UI-blocked rather than claiming they were proven.
- Mutations write to `/audit` (ADMIN/COMMITTEE only); use the generated entity id shown on
  `/payments` to prove the audit row corresponds to the same record.

## Gotcha: state is in-memory per page load
The mock store lives in a module-level variable. A browser refresh (F5) or any full page
load resets everything to the seed. Navigate with the in-app sidebar links (SPA routing)
to preserve state across pages while testing a multi-step flow; only reload deliberately
when you want a clean slate.

## Devin Secrets Needed
None.
