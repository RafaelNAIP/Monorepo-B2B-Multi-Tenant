# Monorepo B2B Multi-Tenant

A modular B2B multi-tenant corporate web platform featuring an admin panel, client portal, and a shared UI component package (decoupled Design System), running on a modern monorepo setup.

> **Status:** Active MVP development — Prisma + MongoDB, HMAC-SHA256 auth, SSE real-time, Cloudflare R2 uploads. 560 tests passing.

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
| Authentication | HMAC-SHA256 (Web Crypto, edge-safe) + httpOnly cookies + bcrypt |
| Testing        | Vitest (workspace mode, strict TDD)            |
| File Storage   | Cloudflare R2 (S3-compatible, presigned URLs)  |
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
│       │   └── api/
│       │       ├── threads/[ticketId]/events/  # SSE endpoint (real-time thread)
│       │       └── upload/
│       │           ├── presign/       # Generate presigned URLs for R2 upload
│       │           └── download/      # Proxy download from R2 (tenant-scoped)
│       ├── components/
│       │   ├── shared/
│       │   │   ├── image-upload-modal.tsx  # Drag-and-drop modal with progress & cancel
│       │   │   └── file-uploader.tsx       # Inline file uploader (used in thread chat)
│       │   └── thread/               # Thread chat components
│       ├── hooks/
│       │   └── use-thread-sse.ts     # Real-time hook used by admin & client views
│       ├── lib/
│       │   ├── attachments/          # Attachment lifecycle (presign, associate, cleanup)
│       │   ├── auth/                 # Protected routes config
│       │   ├── shared/               # Shared utilities (action-state, parse-form, badge-variants, etc.)
│       │   ├── storage/              # R2/S3 client, presign, keys, constants
│       │   ├── sse/                  # Real-time: ThreadEventChannel interface + adapters (InMemory/Redis)
│       │   ├── tenants/              # Domain: Tenants
│       │   ├── tickets/              # Domain: Tickets
│       │   ├── messages/             # Domain: Messages & Threads
│       │   ├── upload/               # Presign service (business rules)
│       │   └── users/                # Domain: Users
│       ├── __tests__/                # Tests organized by domain
│       └── middleware.ts             # Route protection
├── packages/
│   ├── ui/                           # @empresa/ui — Design System
│   ├── auth/                         # @empresa/auth — Session (HMAC-SHA256), guards, rate limiting
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

### Attachments Domain

The `lib/attachments/` and `lib/storage/` modules handle file uploads end-to-end:

```
lib/attachments/
├── schemas.ts     # Zod schemas (file metadata, presign request, attachment keys)
├── data.ts        # Attachment CRUD (create pending → associate → complete)
├── access.ts      # Auth resolution (session or thread token)
├── client.ts      # Browser-side upload logic (presign → PUT to R2)
├── form.ts        # Form field parsing (attachmentKeys JSON)
└── cleanup.ts     # Orphan attachment cleanup (pending > 24h)

lib/storage/
├── client.ts      # S3Client configured for Cloudflare R2
├── presign.ts     # Generate presigned upload/download URLs
├── keys.ts        # File key builder ({tenantId}/{ticketId|novo}/{uuid}.{ext})
├── constants.ts   # Allowed MIME types, max file size, expiry
└── delete.ts      # Delete file from R2
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
JWT_SECRET="a-secure-random-string-at-least-32-characters-long"

# Upstash Redis (optional — rate limit and multi-instance SSE; memory fallback if missing)
# UPSTASH_REDIS_REST_URL="https://<your-db>.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-rest-token"

# Vercel Cron secret for the attachment cleanup job (optional locally)
# CRON_SECRET="a-random-secret"

# Cloudflare R2 (file uploads — optional, uploads disabled if missing)
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="your-bucket-name"
R2_PUBLIC_URL="https://your-bucket.r2.dev"  # optional, for public access
```

**`packages/db/.env`** (Prisma CLI reads from here):

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/empresa?retryWrites=true&w=majority"
```

> **⚠️ `JWT_SECRET` is mandatory** — the app intentionally crashes without it. Use at least 32 random characters. See `.env.example` for generation instructions.

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
| **Users**    | 4 users with bcrypt-hashed passwords (default: `senha@123`)                                          |
| **Tickets**  | 25 tickets for Demo + 1 for Acme (pagination test: 3 pages with pageSize=10)                         |
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

| Tenant | Role   | Email              | Password    |
| ------ | ------ | ------------------ | ----------- |
| Demo   | Admin  | admin@demo.com     | senha@123   |
| Demo   | Client | maria@demo.com     | senha@123   |
| Acme   | Admin  | admin@acme.com     | senha@123   |
| Acme   | Client | ana@acme.com       | senha@123   |

> **Note:** Passwords are hashed with bcrypt (12 salt rounds). After schema changes, run `prisma generate && prisma db push && npm run db:seed` in `packages/db`.

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

Tests use two approaches depending on the domain:

**Preferred: Stateful Prisma fake** (`__tests__/helpers/fake-prisma.ts`) — an in-memory fake with real `where`/`unique`/`$transaction` semantics. Assertions verify **state**, not mock calls:

```typescript
import { fakePrisma as db } from "../helpers/fake-prisma";
vi.mock("@empresa/db", () => ({ prisma: db }));

beforeEach(() => { db.reset(); });

it("creates a ticket", async () => {
  await createTicket({ ... });
  expect(db.all("ticket")[0]).toMatchObject({ status: "open" });
});
```

**Legacy: vi.fn() Prisma mock** (`__tests__/helpers/mock-prisma.ts`) — used by older message/tenant tests. New tests should use `fake-prisma.ts`.

**Auth mock helper** (`__tests__/helpers/mock-auth.ts`) — provides `mockRequireSession`, `mockGetSession`, and `resetAuthMocks` for Server Action tests.

All tests run without a database connection — fully isolated and fast.

The real-time (SSE) tests live in `__tests__/sse/` and test the **real** `ThreadEventChannel` interface with `InMemoryChannel` and `RedisChannel` adapters. The hook tests run in `jsdom` (`// @vitest-environment jsdom`).

### Current Coverage

**560 tests** across 48 test files, organized by domain and layer. All tests pass with 0 `it.fails`.

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
| `User`         | User with `admin` or `client` role, `passwordHash` (bcrypt) — unique per tenant |
| `Ticket`       | Support ticket with full status lifecycle                 |
| `Message`      | Chat message in a ticket thread                          |
| `Attachment`   | File uploaded to R2 (pending → completed lifecycle)       |
| `ThreadAccess` | Public token-based access for client thread               |

All IDs use MongoDB native ObjectIds. The `Ticket.code` field (e.g., `tkt_001`) is a human-readable identifier separate from the ObjectId `id`.

### Authentication

- **Session cookie signed with HMAC-SHA256** (Web Crypto API, edge-safe — no dependency on Node.js `crypto` or `jose`)
- Token format: `base64url(JSON_payload).base64url(HMAC-SHA256(payload, secret))`
- Login via Server Action → Zod validation → Prisma query → bcrypt password verification → HMAC-signed cookie
- Passwords hashed with **bcrypt** (12 salt rounds, ~250ms per hash)
- Generic error messages (`"Credenciais inválidas"`) prevent user enumeration
- `JWT_SECRET` is **mandatory** — missing secret crashes the app intentionally (no fallback)
- **`requireSession()` guard** — centralized in `packages/auth/src/lib/actor.ts`, returns discriminated union `SessionResult`, optional role filter. All Server Actions use it for identity.
- **Middleware** verifies HMAC signature + validates `tenantSlug` from token matches URL path
- **Rate limiting** — sliding window in-memory (`checkRateLimit` with LOGIN/PRESIGN/CRITICAL presets in `@empresa/auth`; not yet integrated into actions/routes)
- Roles: `admin` (administrators) and `client` (end users)

### Real-time Thread (SSE)

The thread updates through **Server-Sent Events** with a pluggable channel architecture (see [ADR 0001](docs/adr/0001-sse-vs-websocket.md)). The SSE channel only *notifies* that something changed; the new state is fetched with the existing `pollThreadMessages` Server Action.

```
Server Action / checkAutoClose ──persist──▶ notifyThread(ticketId, type)
                                                   │
                                      ThreadEventChannel (InMemory or Redis adapter)
                                                   │
                       GET /api/threads/[ticketId]/events  (text/event-stream, authenticated)
                                                   │
                  createThreadSync (EventSource) ──▶ pollThreadMessages ──▶ React state
```

- **Authenticated SSE endpoint** — `resolveThreadActor` validates admin session (cookie) or client thread token (`?token=`)
- **`ThreadEventChannel` interface** with pluggable adapters: `InMemoryChannel` (dev/preview) and `RedisChannel` (production, currently a stub delegating to InMemory). Swap by setting `REDIS_URL`.
- Events: `new_message`, `ticket_updated`, `thread_disconnected` (emitted only **after** the data is persisted)
- Heartbeat every 30s keeps proxies from closing idle connections
- `maxDuration = 60` on the SSE route (Vercel Pro; client auto-reconnects)
- On every (re)connection the client fetches the current state, so nothing is lost while disconnected
- Bursts of events are coalesced: one fetch at a time, plus one follow-up fetch
- **Fallback:** after 3 consecutive SSE errors it falls back to polling every 5s and returns to SSE automatically when the connection reopens
- The channel singleton is anchored on `globalThis`, so route handlers and Server Actions share the same instance even when bundled separately

### File Uploads (Cloudflare R2)

Files are uploaded directly from the browser to Cloudflare R2 using **presigned URLs**, keeping the Next.js server out of the data path:

```
Browser                         Next.js API                    Cloudflare R2
   │                                │                              │
   ├── POST /api/upload/presign ───▶│                              │
   │   (file metadata + auth)       ├── createAttachment(pending)  │
   │                                ├── getPresignedUploadUrl() ──▶│
   │◀── { uploadUrl, fileKey } ─────┤                              │
   │                                │                              │
   ├── PUT uploadUrl (binary) ─────────────────────────────────────▶│
   │◀── 200 OK ────────────────────────────────────────────────────┤
   │                                │                              │
   ├── Submit form (fileKeys) ─────▶│                              │
   │                                ├── attachToTicket/Message()   │
   │                                │   (pending → completed)      │
```

**Key design decisions:**

- **Image-only uploads** — restricted to `.png`, `.jpg`, `.jpeg`, `.webp` (max 10 MB each, max 5 per upload)
- **Tenant isolation** — file keys are prefixed with `{tenantId}/`, and all queries filter by `tenantId`
- **Two upload UIs** — `ImageUploadModal` (drag-and-drop modal with progress bars and cancel) for ticket creation; `FileUploader` (inline) for thread messages
- **Orphan cleanup** — `cleanupOrphanAttachments()` deletes pending attachments older than 24h (both R2 file and database record)
- **Secure download** — `/api/upload/download/[...fileKey]` validates tenant ownership before generating a presigned download URL

### Server Actions

All mutations follow the same pattern using `requireSession()` for identity:

```
requireSession() → parseForm(formData) → Zod validation → Prisma query (await) → revalidatePath → ActionState response
```

- Identity (`tenantId`, author, role, slug) **always** comes from the session — never from FormData
- Client-side uses `useActionState` for loading feedback and per-field errors
- Shared utilities: `parseForm`, `validationErrorState`, `revalidateTenantPaths`, `notifyAndRevalidate`

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
| `Button`  | Variants: default, destructive, secondary, ghost, link |
| `Input`   | With `error` prop and `aria-invalid` support       |
| `Label`   | Based on Radix Label                               |
| `Badge`   | Semantic variants (info, warning, success, danger, neutral, purple, violet, yellow, slate, emerald) — domain-agnostic |
| `Table`   | Semantic table (Table, TableHeader, TableRow, etc) |
| `Dialog`  | Accessible modal based on Radix Dialog             |

> **Note:** `Select` and `Textarea` components are **not available** in `@empresa/ui`. Use native `<select>` and `<textarea>` elements styled with CSS custom properties instead.

### Usage

```tsx
import { Button, Badge, Input } from "@empresa/ui";
import { ticketStatusVariant, priorityVariant } from "@/lib/shared/badge-variants";

<Badge variant={ticketStatusVariant("open")}>Aberto</Badge>
<Badge variant={priorityVariant("high")}>Alta</Badge>
<Badge variant="success">Active</Badge>
```

### Badge Architecture

The Badge component exposes **semantic, domain-agnostic variants** (info, warning, success, danger, neutral, etc.). Domain values (ticket status, priority, subscription) are mapped to these variants by utility functions in `apps/web/lib/shared/badge-variants.ts`:

| Function | Domain → Variant mapping |
| --- | --- |
| `ticketStatusVariant(status)` | open→info, in_progress→warning, resolved→success, pending_feedback→purple, closed→neutral |
| `priorityVariant(priority)` | high→danger, medium→yellow, low→slate |
| `subscriptionVariant(status)` | active→emerald, inactive→neutral, trial→violet |

To add a new domain mapping, create a new function in `badge-variants.ts` — never add domain-specific variants to the UI package.

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
- [x] **File uploads via Cloudflare R2** — presigned URLs, image-only restriction, tenant-scoped keys
- [x] **ImageUploadModal** — drag-and-drop modal with thumbnails, progress bars, and upload cancel (AbortController)
- [x] **FileUploader** — inline uploader for thread message attachments
- [x] **Attachment lifecycle** — pending → completed association (ticket or message), orphan cleanup after 24h
- [x] **Secure download proxy** — tenant-scoped presigned download URLs
- [x] 5 complete domains (tenants, tickets, users, messages, attachments)
- [x] **Password hashing (bcrypt)** — hash/verify with 12 salt rounds, generic error messages, legacy user guard
- [x] **Server-side pagination** — RSC with Suspense streaming for ticket lists
- [x] **Password hashing (bcrypt)** — hash/verify with 12 salt rounds, generic error messages, legacy user guard
- [x] **Server-side pagination** — RSC with Suspense streaming for ticket lists
- [x] 🔒 **Security hardening (4 phases)** — HMAC-SHA256 session cookies (Web Crypto, edge-safe), `requireSession()` centralized guard, middleware with signature verification, rate limiting (in-memory sliding window)
- [x] 📡 **Real-time hardening (5 phases)** — authenticated SSE endpoint, thread token expiration/revocation, `ThreadEventChannel` interface with InMemory/Redis adapters, Vercel `maxDuration`, ADR documented
- [x] 🧹 **Code cleanup refactoring (6 phases)** — SSE singleton fix, dead code removal, full auth migration to `requireSession()`, Badge decoupled from domain, `ActionState` local to auth package, `$transaction` for ticket code atomicity, Button variant fixes
- [x] 🚦 **Rate limiting via Redis** — async store on Upstash (sliding window on sorted set, single pipeline), fail-open when Redis is down, memory fallback without `UPSTASH_*`
- [x] 🚦 **Rate limit in actions** — login by IP (5/min, before any DB query), critical actions by session (20/min) returning `ActionState` errors in PT
- [x] 📡 **Real `RedisChannel`** — cross-instance SSE fan-out: publish to Upstash list + server-side polling inside the SSE route (de-dup by event id, own-origin skipped)
- [x] 🚀 **Vercel deploy prep** — `vercel.json` (build + daily cron), attachment cleanup exposed to Vercel Cron via `CRON_SECRET`
- [x] 598 tests passing (strict TDD across 52 test files, 0 `it.fails`)

### 🔜 Next Steps (by priority)

- [ ] **Rate limit on presign route** — `RATE_LIMIT_PRESIGN` preset is ready; plug `getRateLimiter()` into `POST /api/upload/presign` (returns 429)
- [ ] **Abstractions** — `StorageProvider` interface over R2, `UserRole` in shared package
- [ ] **Upload enhancements** — `HeadObject` validation on attach, allow message with attachment only, per-file progress
- [ ] **E2E tests** — Playwright for critical flows
- [ ] **CI/CD** — GitHub Actions with Turbo remote cache
- [ ] **Internationalization (i18n)** — next-intl for multi-language support
- [ ] **Observability** — structured logging + metrics

### 🔮 Future

- [ ] Granular role-based access control (RBAC)
- [ ] Email notifications for thread updates
- [ ] **Login rate limit by IP + email** — today the key is IP only (`x-forwarded-for`); add a second window keyed by the submitted email to resist distributed brute force and account enumeration

---

## Deploy na Vercel

O app roda em Vercel com Fluid Compute. O `apps/web/vercel.json` já define o build do monorepo e o cron diário de limpeza de anexos.

### 1. Criar o projeto

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Em **Root Directory**, selecione `apps/web`. O Vercel lê o `vercel.json` dali.
3. Framework: **Next.js** (detectado automaticamente). Não altere os comandos de build, eles já estão no `vercel.json`.

### 2. Banco e Redis

1. **MongoDB:** use uma URL do Atlas (ver [Database Setup](#database-setup)).
2. **Upstash Redis:** no painel do projeto, **Storage → Marketplace → Upstash (Redis)**. A integração preenche `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` automaticamente.

### 3. Variáveis de ambiente

Em **Settings → Environment Variables**, configure:

| Variável | Obrigatória | Observação |
| -------- | ----------- | ---------- |
| `DATABASE_URL` | Sim | URL do MongoDB Atlas |
| `JWT_SECRET` | Sim | Mínimo 32 caracteres. O app não sobe sem ela |
| `UPSTASH_REDIS_REST_URL` | Recomendado | Rate limit compartilhado e SSE entre instâncias |
| `UPSTASH_REDIS_REST_TOKEN` | Recomendado | Par da variável acima |
| `CRON_SECRET` | Sim, para o cron | A Vercel envia `Authorization: Bearer $CRON_SECRET` |
| `R2_*` | Para anexos | `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |

### 4. Cron de limpeza

`GET /api/attachments/cleanup` roda todo dia às 03:00 UTC e remove anexos pendentes (órfãos) com mais de 1 hora. Sem `CRON_SECRET`, a rota responde 403. O `POST` continua disponível para admins logados.

> O plano Hobby da Vercel só aceita crons diários. Para execuções mais frequentes, é preciso o plano Pro.

### 5. Primeiro deploy

Depois do primeiro build, rode o seed contra o banco de produção a partir da sua máquina, com `DATABASE_URL` apontando para o Atlas: `npm run db:seed -w @empresa/db`. Valide o login e uma thread com duas abas abertas em navegadores diferentes para confirmar o fan-out SSE.

> Validado apenas pelos testes automatizados. Não foi feito deploy real: confira o build na primeira execução, pois os comandos de install/build dependem do Root Directory configurado no painel.

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
| `Upload indisponível: variáveis do R2 não configuradas` | Missing R2 env vars | Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` in `apps/web/.env` |
| `Can't resolve '@aws-sdk/client-s3'` | Missing S3 SDK | Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` in `apps/web` |
| `Anexos Inválidos` on ticket/message submit | Attachment association failed | Likely a MongoDB null-vs-absent issue; ensure you're on the latest commit with the two-step find+filter fix |
| App crashes without clear error | `JWT_SECRET` missing from `.env` | Add `JWT_SECRET` to `apps/web/.env` (min 32 chars) |
| SSE not working across instances (production) | `UPSTASH_REDIS_REST_*` missing | Add both variables to the Vercel project (see `.env.example`) |
| Login says `Muitas tentativas` during testing | IP exceeded 5 login attempts in 1 minute | Wait for the window to clear (`retryAfterMs` is in the message), or restart the dev server to reset the in-memory store |
| `data and hash arguments required` on login | Users in DB created before `passwordHash` field was added | Run `prisma generate && prisma db push && npm run db:seed` in `packages/db` to recreate users with hashed passwords |
| `Unknown argument passwordHash` on seed | Prisma Client not regenerated after schema change | Run `npx prisma generate` in `packages/db` before seeding |

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

### Prisma + MongoDB: null vs absent fields

Prisma's MongoDB adapter does **not** match `fieldName: null` against documents where that field was never set (absent). This is a known gotcha. The attachment data layer handles it with a two-step approach: `findMany` without null filters, then filter in JavaScript with `!a.fieldName` (which catches both `null` and `undefined`). Always set optional fields explicitly to `null` in `create()` calls to avoid this issue in new code.

### Cloudflare R2 Setup

To enable file uploads, create an R2 bucket in Cloudflare and configure CORS to allow `PUT` from your development origin (`http://localhost:3000`). Generate an API token with **Object Read & Write** permission for your bucket, then set the environment variables in `apps/web/.env`.

### npm Workspaces Alternative

When using npm instead of pnpm, replace `workspace:*` with `*` in each app/package's `package.json` dependencies.

---

## License

ISC
