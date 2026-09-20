# MySociety web UI

React, TypeScript, Vite, Material UI, React Router, TanStack Query, React Hook Form, Zod, Zustand, Recharts, Axios, and Vitest power the MySociety community-management web application.

## Run locally

```sh
cd mysociety-frontend
npm install
cp .env.example .env.local
npm run dev
```

Validate production readiness with:

```sh
npm run lint
npm test
npm run build
```

## API and security contract

`VITE_API_BASE_URL` defaults to `http://localhost:8080/api/v1`, the API Gateway. Page components call typed API/service modules only; the UI never accesses a service database. Axios sends credentials for the HttpOnly refresh-cookie flow. Access tokens remain in memory and are never persisted to browser storage. The only browser-persisted authentication convenience is an explicitly selected remembered email.

The live integration assumes `POST /auth/login`, `POST /auth/select-society`, and typed gateway resources beneath the configured base URL. RFC 9457 validation errors should be returned as safe, user-readable messages. Society identity must be derived from the session/API contract rather than user-entered tenant headers.

## Local demo mode

Set `VITE_USE_MOCK_API=true` to use the isolated `src/mocks/mockApi.ts` service implementation. It is intended for local development and tests only, and is not a production authentication mechanism. The seeded demo users are `admin@mysociety.test`, `resident@mysociety.test`, and `security@mysociety.test`; their mock-only passwords are defined in the mock service data. Never enable mock mode or distribute those accounts in production.

## Features

- Responsive Material UI app shell with desktop collapse and mobile navigation drawer.
- Auth, password-reset, MFA, invitation, society selection, unauthorized, and session-expired routes.
- Role-aware route/navigation presentation for residents, administrators, committee members, accountants, security guards, facility managers, vendors, and platform administrators. The API remains authoritative for every action.
- Role-specific dashboards with responsive Recharts visualizations.
- Navigable society, residents, finance, operations, community, communication, reporting, audit, profile, and settings workflows with reusable filtering, pagination, empty states, confirmation dialogs, and user-facing errors.
