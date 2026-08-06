# Intervue

Intervue is a Bun/Turbo monorepo for an AI interview platform. The app is split into a React client, an Express API, and shared TypeScript packages so UI forms, API payloads, and server validation stay aligned.

## Architecture

```text
apps/
  web/       React 19 UI, React Router pages, auth context, API services
  server/    Express API, Prisma/Postgres persistence, AI and billing integrations
packages/
  common/    Shared Zod validation schemas and TypeScript types
  eslint-config/
  typescript-config/
```

The web app talks to the API through `apps/web/src/services/api-client.ts`, sending credentials with each request and refreshing expired sessions through `/auth/refresh`. Route guards in `apps/web/src/components/common/route-guards.tsx` separate guest-only auth pages from protected interview, billing, and history pages.

The server exposes versioned routes under `/api/v1`:

- `/auth` handles local login, Google OAuth, password reset, token refresh, and logout.
- `/interviews` creates interviews, starts realtime sessions, returns results, and exports reports/transcripts.
- `/billing` lists plans, manages Stripe checkout/portal sessions, and receives webhooks.

Prisma models users, password tokens, interviews, transcript messages, and interview results. Interview audio sessions use the OpenAI Realtime sideband connection to capture candidate/interviewer messages, while final scoring is produced from the stored transcript and saved as an `InterviewResult`.

Shared contracts live in `@repo/common`, especially `validations` for Zod schemas and `types` for client/server DTOs. Both apps import these instead of duplicating request and response shapes.
