# Monorepo B2B Multi-Tenant

A modular B2B multi-tenant corporate web platform featuring an admin panel, client portal, and a shared UI component package (decoupled Design System), running on a modern monorepo setup.

> **Status:** Active MVP development — Prisma + MongoDB database layer with full seed data.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Architecture](#architecture)
- [Application Flows](#application-flows)
- [Design System](#design-system)
- [Project Conventions](#project-conventions)
- [Current Status & Roadmap](#current-status--roadmap)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)
- [License](#license)

---

## Overview

This project tackles the challenge of building a B2B SaaS platform where multiple companies (tenants) share the same application while having fully isolated data, branding, and permissions.

### Technical Challenges

- Strict interface contracts and end-to-end shared typing
- React Server Components (RSC) with Zod-validated secure Server Actions
- UI streaming with Suspense for heavy metrics
- Accessibility tokens (WCAG 2.1 AA) without legacy CSS-in-JS dependency
- Multi-tenant isolation across routing, data, and authentication
- Prisma ORM with MongoDB for persistent data layer

---

## Tech Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Monorepo       | Turborepo + pnpm workspaces                    |
| Runtime        | Node.js ≥ 20, pnpm 9.12+                      |
| Framework      | Next.js 15 (App Router, Turbopack)             |
| Language       | TypeScript 5.6+ (strict mode)                  |
| Database       | MongoDB (via Prisma ORM)                       |
| ORM            | Prisma 6.6.0 (`@prisma/client`)               |
| Validation     | Zod 3.x (`^3.23.0`)                           |
| UI Components  | Radix UI + Class Variance Authority + Tailwind |
| Authentication | jose (JWT) + httpOnly cookies                  |
| Testing        | Vitest (workspace mode, strict TDD)            |
| Styling        | CSS Custom Properties (design tokens)          |

---

## Monorepo Structure

```
monorepo-empresa/
├── apps/
│   └── web/                          # Next.js 15 main app
│       ├── app/
│       │   └── (tenant)/
│       │       └── [tenantSlug]/
│       │           ├── admin/        # Admin panel
│       │           │   ├── chamados/ # Ticket management
│       │           │   └── tema/     # Branding/theme config
│       │           ├── auth/         # Login page
│       │           ├── dashboard/    # Client ticket list
│       │           ├── chamados/     # Client ticket creation
│       │           └── thread/
│       │               └── [token]/  # Public client thread (no auth)
│       │   └── api/
│       │       └── threads/[ticketId]/events/  # SSE endpoint (real-time thread)
│       ├── components/
│       │   └── thread/               # Thread chat components
│       ├── hooks/
│       │   └── use-thread-sse.ts     # Real-time hook used by admin & client views
│       ├── lib/
│       │   ├── sse/                  # Real-time: event emitter + sync controller
│       │   ├── tenants/              # Domain: Tenants
│       │   ├── tickets/              # Domain: Tickets
│       │   ├── messages/             # Domain: Messages & Threads
│       │   └── users/                # Domain: Users
│       ├── __tests__/                # Tests organized by domain
│       └── middleware.ts             # Route protection
├── packages/
│   ├── ui/                           # @empresa/ui — Design System
│   ├── auth/                         # @empresa/auth — JWT Auth
│   └── db/                           # @empresa/db — Prisma + MongoDB
│       ├── prisma/
│       │   └── schema.prisma         # Full database schema
│       └── src/
│           ├── index.ts              # PrismaClient singleton
│           └── seed.ts               # Seed script with demo data
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Domain Convention (5 files per domain)

Each business domain (`tickets`, `tenants`, `users`, `messages`) follows a fixed structure:

```
lib/<domain>/
├── constants.ts   # Typed enums and constants
├── types.ts       # Domain interfaces
├── schemas.ts     # Zod validation schemas
├── data.ts        # Data layer (Prisma queries — all async)
└── actions.ts     # Server Actions (form handlers)
```

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9.12 (`npm install -g pnpm`) — or npm
- **Git**
- **MongoDB** — Atlas (free tier) or local with replica set

> **Windows:** Enable Developer Mode for symlinks, or configure `.npmrc` as described in [Known Issues](#known-issues).

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/RafaelNAIP/Monorepo-B2B-Multi-Tenant.git
cd Monorepo-B2B-Multi-Tenant
git checkout dev

# 2. Install dependencies
pnpm install

# 3. (Windows) If you have symlink issues, create .npmrc at the root:
echo "node-linker=hoisted" >> .npmrc
echo "shamefully-hoist=true" >> .npmrc
pnpm install
```

### Alternative: npm workspaces

The project also supports npm workspaces as an alternative to pnpm:

```bash
npm install
npm run dev
```

---

## Database Setup

The project uses **MongoDB** with **Prisma ORM**. The database package lives in `packages/db`.

### Option A: MongoDB Atlas (recommended)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster (free tier M0 is sufficient)
3. Create a database user in **Database Access**
4. Whitelist your IP in **Network Access** (or `0.0.0.0/0` for development)
5. Click **Connect** → **Drivers** and copy the connection string

### Option B: MongoDB Local (Docker)

MongoDB with Prisma requires a **replica set**, even locally:

```bash
# Start MongoDB with replica set
docker run -d --name mongo-rs \
  -p 27017:27017 \
  mongo:7 mongod --replSet rs0

# Initialize the replica set
docker exec -it mongo-rs mongosh --eval "rs.initiate()"
```

Connection string: `mongodb://localhost:27017/empresa?replicaSet=rs0`

### Configure Environment Variables

Create `.env` files in **two locations**:

**`apps/web/.env`** (Next.js reads from here):

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/empresa?retryWrites=true&w=majority"
JWT_SECRET="any-secure-string-here"
```

**`packages/db/.env`** (Prisma CLI reads from here):

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/empresa?retryWrites=true&w=majority"
```

> **Important:** If an `apps/web/.env.local` file exists, it takes **priority** over `.env` in Next.js. Delete it or ensure its `DATABASE_URL` is correct.

### Generate Prisma Client & Push Schema

```bash
cd packages/db
npx prisma generate    # Generate the TypeScript client
npx prisma db push     # Create collections in MongoDB
```

### Seed the Database

```bash
cd packages/db
npm run db:seed
```

The seed creates:

| Data         | Details                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| **Tenants**  | Demo Corp (`demo`), Acme Inc (`acme`) — each with custom branding                                   |
| **Users**    | `joao@demo.com` (admin), `maria@demo.com` (client), `admin@acme.com` (admin), `cliente@acme.com` (client) |
| **Tickets**  | 3 sample tickets with different statuses and priorities                                              |
| **Messages** | Thread messages between admin and client                                                             |
| **Threads**  | ThreadAccess tokens for public client access                                                         |

---

## Running the Project

```bash
# Run all apps in development mode
pnpm dev

# Run only the web app
pnpm dev --filter=@empresa/web

# Alternative with npm
npm run dev

# Production build
pnpm build

# Type checking
pnpm type-check
```

The app will be available at `http://localhost:3000`.

### Example Routes

| Route                                | Description                           |
| ------------------------------------ | ------------------------------------- |
| `/demo/auth`                         | Tenant "demo" login page              |
| `/demo/dashboard`                    | Client dashboard — ticket list        |
| `/demo/chamados/novo`                | Create new ticket                     |
| `/demo/admin/chamados`               | Admin panel — ticket management       |
| `/demo/admin/chamados/[ticketId]`    | Admin ticket detail + thread chat     |
| `/demo/thread/[token]`               | Public client thread (no auth needed) |

### Login Credentials

| Tenant | Role   | Email              | Password     |
| ------ | ------ | ------------------ | ------------ |
| Demo   | Admin  | joao@demo.com      | any password |
| Demo   | Client | maria@demo.com     | any password |
| Acme   | Admin  | admin@acme.com     | any password |
| Acme   | Client | cliente@acme.com   | any password |

> **Note:** Password verification is not yet implemented (placeholder for bcrypt). Any password is accepted if the user exists in the database.

---

## Testing

The project follows **strict TDD** — tests are always written before implementation.

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest

# Run tests for a specific domain
npx vitest run __tests__/tickets

# Verbose output
npx vitest run --reporter=verbose
```

### Test Architecture

Tests use a **shared Prisma mock** (`__tests__/helpers/mock-prisma.ts`) that stubs all database calls:

```typescript
import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

beforeEach(() => {
  resetPrismaMocks();
});
```

This means tests run without a database connection — fully isolated and fast.

The real-time (SSE) tests live in `__tests__/sse/` and avoid asserting on mocks: they subscribe to the **real** event emitter, call the **real** route handler and read its stream. The hook tests run in `jsdom` (`// @vitest-environment jsdom`).

### Current Coverage

**241 tests** across 19 test files, organized by domain and layer:

| Domain   | Schemas | Data Layer | Actions | Lifecycle | Total |
| -------- | ------- | ---------- | ------- | --------- | ----- |
| Tickets  | 10      | 18         | 16      | 16        | 60    |
| Messages | 20      | 11         | 12      | —         | 43    |
| Tenants  | 19      | 9          | 7       | —         | 35    |
| Users    | 16      | 14         | —       | —         | 30    |
| Real-time (SSE) | —  | —          | —       | —         | 73    |

The 73 SSE tests cover: event emitter (11), SSE route handler (11), sync controller with polling fallback (19), `useThreadSSE` hook (8), actions emitting events (18) and an end-to-end integration of emitter + route + controller (6).

---

## Architecture

### Multi-Tenancy

Tenant isolation happens at three levels:

1. **Routing** — All routes live under `/(tenant)/[tenantSlug]/`, the slug identifies the tenant
2. **Authentication** — JWT contains `tenantId` and `tenantSlug`, validated in middleware and Server Components
3. **Data** — All Prisma queries filter by `tenantId`, ensuring a tenant never sees another tenant's data

```
Request → Middleware (validate JWT) → RSC (getSession + guard) → Prisma Data Layer (filter by tenantId)
```

### Database (Prisma + MongoDB)

The `@empresa/db` package provides a singleton PrismaClient and re-exports all generated types:

| Model          | Description                                              |
| -------------- | -------------------------------------------------------- |
| `Tenant`       | Organization with embedded `TenantTheme` (colors, logo)  |
| `User`         | User with `admin` or `client` role (unique per tenant)   |
| `Ticket`       | Support ticket with full status lifecycle                 |
| `Message`      | Chat message in a ticket thread                          |
| `ThreadAccess` | Public token-based access for client thread               |

All IDs use MongoDB native ObjectIds. The `Ticket.code` field (e.g., `tkt_001`) is a human-readable identifier separate from the ObjectId `id`.

### Authentication

- Login via Server Action → Prisma query for user → generate JWT with `jose` → store in httpOnly cookie
- Middleware protects routes (`/dashboard`, `/chamados`, `/admin`)
- Server Components use `getSession()` as a guard before rendering
- Roles: `admin` (administrators) and `client` (end users)

### Real-time Thread (SSE)

The thread updates through **Server-Sent Events**. The SSE channel only *notifies* that something changed; the new state is fetched with the existing `pollThreadMessages` Server Action.

```
Server Action / checkAutoClose ──persist──▶ notifyThread(ticketId, type)
                                                   │
                                      ThreadEventEmitter (in-memory, per ticket)
                                                   │
                       GET /api/threads/[ticketId]/events  (text/event-stream)
                                                   │
                  createThreadSync (EventSource) ──▶ pollThreadMessages ──▶ React state
```

- Events: `new_message`, `ticket_updated`, `thread_disconnected` (emitted only **after** the data is persisted)
- Heartbeat every 30s keeps proxies from closing idle connections
- On every (re)connection the client fetches the current state, so nothing is lost while disconnected
- Bursts of events are coalesced: one fetch at a time, plus one follow-up fetch
- **Fallback:** after 3 consecutive SSE errors it falls back to polling every 5s and returns to SSE automatically when the connection reopens
- The emitter is anchored on `globalThis`, so route handlers and Server Actions share the same instance even when bundled separately

### Server Actions

All mutations follow the same pattern:

```
FormData → Field extraction → Zod validation → Prisma query (await) → revalidatePath → Typed response
```

Client-side uses `useActionState` for loading feedback and per-field errors.

---

## Application Flows

### Admin Flow

```
Login → Admin Panel
         ├── Tenants (list with text & subscription filters)
         ├── Tickets (list, filters, "Assign" button for open tickets, "View" for details)
         └── Branding (theme editor: colors, logo, border-radius)
```

**Tickets:**
- Admin sees all tickets for their tenant
- Open tickets display an **Assign** button
- Assigning a ticket changes status to "In Progress" and assigns it to the admin
- Each ticket has a detail page with a **thread chat view**

### Thread Communication Flow (Admin ↔ Client)

```
1. Admin assigns ticket          → status: "in_progress"
2. Admin generates public link   → creates ThreadAccess with unique token
3. Client opens link             → /{tenantSlug}/thread/{token} (no auth required)
4. Messages exchanged            → real-time via SSE (/api/threads/[ticketId]/events)
5. Admin disconnects             → status: "pending_feedback", 24h deadline
6. Client gives feedback         → "Resolved" or "Not resolved"
7. Auto-close                    → If no response in 24h, auto-closes (check-on-access)
```

**Key features:**
- Token-based public access for clients (no login required)
- Branded per tenant (colors, logo from tenant theme)
- Real-time message and status updates via SSE, with automatic polling fallback
- Client decides resolution after admin disconnects
- Automatic closure after 24h deadline

### Client Flow

```
Login → Dashboard → Tickets (create, track status)
                  → Thread (respond to admin via public link)
```

---

## Design System

The `@empresa/ui` package provides accessible headless components styled with Tailwind CSS and CSS Custom Properties.

### Available Components

| Component | Description                                        |
| --------- | -------------------------------------------------- |
| `Button`  | Variants: default, destructive, outline, ghost     |
| `Input`   | With `error` prop and `aria-invalid` support       |
| `Label`   | Based on Radix Label                               |
| `Badge`   | Variants for status, priority, and subscription    |
| `Table`   | Semantic table (Table, TableHeader, TableRow, etc) |
| `Dialog`  | Accessible modal based on Radix Dialog             |

> **Note:** `Select` and `Textarea` components are **not available** in `@empresa/ui`. Use native `<select>` and `<textarea>` elements styled with CSS custom properties instead.

### Usage

```tsx
import { Button, Badge, Input } from "@empresa/ui";

<Badge variant="open">Open</Badge>
<Badge variant="high">High</Badge>
<Badge variant="active">Active</Badge>
```

### Badge Variants

| Group        | Variants                                                      |
| ------------ | ------------------------------------------------------------- |
| Status       | `open`, `in_progress`, `resolved`, `pending_feedback`, `closed` |
| Priority     | `high`, `medium`, `low`                                       |
| Subscription | `active`, `inactive`, `trial`                                 |

---

## Project Conventions

### Language

| Context                          | Language    | Example                                     |
| -------------------------------- | ----------- | ------------------------------------------- |
| Types, variables, functions      | English     | `Ticket`, `getTickets()`, `assignedTo`      |
| UI labels, error messages        | Portuguese  | `"Título deve ter ao menos 5 caracteres"`   |
| Test names (describe/it)         | Portuguese  | `"rejeita categoria inválida"`              |
| File names                       | English     | `admin-ticket-table.tsx`                    |

### Code Standards

- **TypeScript strict mode** — no `any`, no `@ts-ignore`
- **Zod 3.x** — Zod 4 breaks `errorMap` in `z.enum()`, do not use
- **forwardRef + CVA + cn()** — mandatory pattern for UI components
- **Server Components** — data fetching and auth guards live in RSC
- **Client Components** — only for interactivity (forms, filters, state)
- **CSS Custom Properties** — design tokens via `var(--color-*)`, no CSS-in-JS
- **All data layer functions are async** — always use `await` when calling them

### TDD Methodology

The Red → Green → Refactor cycle is mandatory for every new feature:

1. Write failing tests (Red)
2. Implement minimal code to pass (Green)
3. Refactor without breaking tests (Refactor)
4. Run the full suite before closing the task

---

## Current Status & Roadmap

### ✅ Completed

- [x] Turborepo monorepo with pnpm workspaces
- [x] Multi-tenant authentication (JWT + httpOnly cookies)
- [x] Route protection middleware
- [x] Base Design System with 6 components (`@empresa/ui`)
- [x] Admin panel — tenant list with filters (text + subscription)
- [x] Admin panel — branding/theme configuration
- [x] Admin panel — navigation with active page highlight
- [x] Ticket system — creation, listing, and filters
- [x] Ticket system — admin assignment ("Assign" action)
- [x] Admin ticket detail page with thread chat
- [x] Thread communication — chat between admin and client
- [x] Public token-based access for clients (no auth required)
- [x] Admin disconnect + client feedback flow
- [x] Auto-close after 24h deadline (check-on-access pattern)
- [x] Real-time thread updates via SSE (with polling fallback, replaces the 3s polling)
- [x] Client dashboard with ticket list and filters
- [x] Client ticket creation form with Zod validation
- [x] 4 complete domains (tenants, tickets, users, messages)
- [x] **Prisma + MongoDB** — Full database layer (migrated from in-memory mocks)
- [x] Seed script with demo data (tenants, users, tickets, messages, threads)
- [x] 241 tests passing (strict TDD, including SSE integration tests)

### 🔜 Next Steps

- [ ] **Password hashing (bcrypt)** — Login currently accepts any password; implement proper hash/verify
- [ ] **Real file uploads** — Integrate with S3/R2 (currently visual-only)
- [ ] **Server-side pagination** — RSC with Suspense streaming
- [ ] **E2E tests** — Playwright for critical flows

### 🔮 Future

- [ ] **Real-time: authorize the SSE endpoint** — `/api/threads/[ticketId]/events` is unauthenticated (same as `pollThreadMessages`). It carries no message data, but anyone with a `ticketId` can see that there is activity. Validate the thread token or the admin session
- [ ] **Real-time: multiple server instances** — the event emitter is in-memory (single instance). To scale horizontally, swap `ThreadEventEmitter` for Redis pub/sub keeping the same `subscribe/emit` interface
- [ ] CI/CD with GitHub Actions + Turbo remote cache
- [ ] Internationalization (i18n) with next-intl
- [ ] Rate limiting on Server Actions
- [ ] Observability — structured logging + metrics
- [ ] Granular role-based access control (RBAC)
- [ ] Email notifications for thread updates

---

## Troubleshooting

| Error | Cause | Solution |
| ----- | ----- | -------- |
| `Environment variable not found: DATABASE_URL` | `.env` missing or in the wrong directory | Create `.env` in both `apps/web/` and `packages/db/` |
| `the URL must start with the protocol mongo` | Old `.env.local` with a PostgreSQL URL | Delete `apps/web/.env.local` |
| `Cannot read properties of undefined (reading 'primaryColor')` | Missing `await` on an async data call | Ensure all data layer calls use `await` |
| `Malformed ObjectID: invalid character` | Code using mock-era IDs (`t_01`, `u_01`) | Use real MongoDB ObjectIds |
| `No command registered for 'generate'` | Prisma version mismatch (not 6.6.0) | `npm install prisma@6.6.0 --save-exact` in `packages/db` |
| `Could not find Prisma Schema` | Running `prisma generate` from the wrong directory | Run from `packages/db/`, not the project root |
| `Cannot find module '@empresa/db'` | Missing from `transpilePackages` | Check `apps/web/next.config.ts` includes `@empresa/db` |
| `Cannot find module 'next'` (Windows) | pnpm symlink issue | Add `node-linker=hoisted` to `.npmrc` and reinstall |

---

## Known Issues

### pnpm on Windows (Symlinks)

Windows without Developer Mode does not support symlinks. Add to `.npmrc` at the root:

```ini
node-linker=hoisted
shamefully-hoist=true
```

If `Cannot find module 'next'` persists, delete all `node_modules` and `pnpm-lock.yaml` and reinstall.

### Zod 3 vs Zod 4

The project uses **Zod 3.x** (`^3.23.0`). Do not install Zod 4 — it ignores custom `errorMap` in `z.enum()`, breaking all Portuguese error messages.

### Prisma Version

Prisma is pinned to **6.6.0**. Newer versions (e.g., 6.19) may have breaking changes in the CLI. If `prisma generate` fails, check the version with `npx prisma --version`.

### `.env.local` Priority

Next.js loads `.env.local` with **higher priority** than `.env`. An old `.env.local` with a PostgreSQL connection string will silently override your MongoDB `DATABASE_URL`. Always check for stale `.env.local` files when debugging connection issues.

### Password Verification

Login currently accepts **any password** if the user exists in the database. This is a placeholder — implement bcrypt hash/verify before any production use.

### npm Workspaces Alternative

When using npm instead of pnpm, replace `workspace:*` with `*` in each app/package's `package.json` dependencies.

---

## License

ISC
