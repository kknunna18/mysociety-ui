# MySociety Frontend

React + TypeScript + Vite frontend for the MySociety multi-tenant society management platform:
residents, maintenance billing, payments, complaints, visitors, facility bookings, role-based
access and an audit trail.

The app ships with an **in-memory mock API** so it runs end to end with no backend.

## Quick start

```sh
npm install
cp .env.example .env.local   # optional; defaults work out of the box
npm run dev                  # http://localhost:5173
```

Sign in with one of the mock accounts:

| Role     | Email                   | Password    |
| -------- | ----------------------- | ----------- |
| Admin    | admin@mysociety.test    | admin123    |
| Resident | resident@mysociety.test | resident123 |
| Security | security@mysociety.test | security123 |

## Scripts

| Command                 | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Vite dev server on port 5173                  |
| `npm run build`         | Type-checks (`tsc -b`) then builds to `dist/` |
| `npm run preview`       | Serves the production build on port 4173      |
| `npm test`              | Vitest run (jsdom + Testing Library)          |
| `npm run test:watch`    | Vitest in watch mode                          |
| `npm run test:coverage` | Vitest with v8 coverage                       |
| `npm run lint`          | ESLint 9 flat config                          |
| `npm run format`        | Prettier write                                |

## Environment

All variables are optional; see `.env.example`.

| Variable                  | Default                     | Purpose                                          |
| ------------------------- | --------------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL`       | `http://localhost:8080/api` | Backend base URL (used when the mock API is off) |
| `VITE_API_PROXY_TARGET`   | `http://localhost:8080`     | Vite development proxy target                  |
| `VITE_USE_MOCK_API`       | `false`                     | Set to `true` to use the in-memory mock API     |
| `VITE_DEFAULT_SOCIETY_ID` | `green-valley`              | Sent as the `X-Society-Id` tenant header         |
| `VITE_MOCK_LATENCY_MS`    | `150`                       | Simulated latency for the mock API               |

## Project structure

```
mysociety-frontend/
├─ index.html
├─ vite.config.ts            # Vite + Vitest config, "@" -> ./src alias
├─ eslint.config.js          # ESLint 9 flat config (TS + react-hooks + prettier)
├─ public/                   # favicon.svg, robots.txt
└─ src/
   ├─ api/
   │  ├─ client.ts           # picks mock vs HTTP impl at call time
   │  └─ http.ts             # fetch wrapper: auth header, tenant header, ApiError
   ├─ components/            # AppLayout, DataTable, ProtectedRoute, StatusBadge, …
   ├─ context/AuthContext.tsx
   ├─ hooks/                 # useAuth, useAsync
   ├─ mocks/                 # data.ts (sample data) + mockApi.ts (in-memory API)
   ├─ pages/                 # Dashboard, Residents, Billing, Payments, Complaints,
   │                         # Visitors, Bookings, Audit, Login, NotFound
   ├─ styles/index.css
   ├─ test/                  # Vitest setup + render helpers
   ├─ types/index.ts         # domain types + ApiError
   └─ utils/format.ts
```

## How it works

- `src/api/client.ts` exports a proxy that resolves each call to either `mocks/mockApi.ts` or the
  HTTP implementation, based on `VITE_USE_MOCK_API`. Pages never import the mock directly, so
  switching to the real backend is a single env change.
- The mock API keeps a mutable in-memory store seeded from `mocks/data.ts`, enforces business rules
  (no duplicate active resident per unit, no paying an already-paid invoice, no double-booked
  facility slot) and appends to an audit log. `resetMockDb()` restores the seed between tests.
- `AuthProvider` persists the session in `localStorage`; `authService` owns token operations and
  `ProtectedRoute` redirects anonymous users
  to `/login` and blocks routes whose `roles` do not include the signed-in user's role (`/audit` is
  admin/committee only).
- `useAsync` handles the loading/error/reload lifecycle; `AsyncBoundary` renders those states.

## Backend contract

With `VITE_USE_MOCK_API=false` the app calls, relative to `VITE_API_BASE_URL`:

```
POST   /auth/login                 GET  /dashboard/summary
GET    /residents?q=               POST /residents
GET    /invoices                   GET  /payments        POST /payments
GET    /complaints                 POST /complaints      PATCH /complaints/:id/status
GET    /visitors                   POST /visitors/:id/check-in   POST /visitors/:id/check-out
GET    /facilities                 GET  /bookings        POST /bookings   POST /bookings/:id/cancel
GET    /audit
```

Every request carries `X-Society-Id` and, once signed in, `Authorization: Bearer <token>`.

In development, `/api` is proxied by Vite to `VITE_API_PROXY_TARGET`. Production calls use
`VITE_API_BASE_URL` directly, so the Spring Boot backend must allow the deployed frontend origin in
its CORS configuration and allow the `Authorization` and `X-Society-Id` headers. If refresh tokens
are added later as cookies, enable Axios credentials and configure Spring Boot for credentialed CORS
with an explicit allowed origin.

## Tests

Vitest + Testing Library cover the mock API business rules, formatting helpers, route guarding, the
login flow and the billing "record payment" flow.

```sh
npm test
```
