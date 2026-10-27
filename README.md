# Monorepo B2B Multi-Tenant

A modular B2B multi-tenant corporate web platform featuring an admin panel, client portal, and a shared UI component package (decoupled Design System), running on a modern monorepo setup.

> **Status:** Active MVP development — in-memory mock data, no database yet.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Architecture](#architecture)
- [Application Flows](#application-flows)
- [Design System](#design-system)
- [Project Conventions](#project-conventions)
- [Current Status & Roadmap](#current-status--roadmap)
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

---

## Tech Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Monorepo       | Turborepo + pnpm workspaces                    |
| Runtime        | Node.js ≥ 20, pnpm 9.12+                      |
| Framework      | Next.js 15 (App Router, Turbopack)             |
| Language       | TypeScript 5.6+ (strict mode)                  |
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
│       ├── components/
│       │   └── thread/               # Thread chat components
│       ├── lib/
│       │   ├── tenants/              # Domain: Tenants
│       │   ├── tickets/              # Domain: Tickets
│       │   ├── messages/             # Domain: Messages & Threads
│       │   └── users/                # Domain: Users
│       ├── __tests__/                # Tests organized by domain
│       └── middleware.ts             # Route protection
├── packages/
│   ├── ui/                           # @empresa/ui — Design System
│   └── auth/                         # @empresa/auth — JWT Auth
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
├── data.ts        # Data layer (CRUD, queries)
└── actions.ts     # Server Actions (form handlers)
```

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9.12 (`npm install -g pnpm`)
- **Git**

> **Windows:** Enable Developer Mode for symlinks, or configure `.npmrc` as described in [Known Issues](#known-issues).

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/RafaelNAIP/Monorepo-B2B-Multi-Tenant.git
cd Monorepo-B2B-Multi-Tenant

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

### Test Credentials

| Role  | Email            | Password |
| ----- | ---------------- | -------- |
| Admin | admin@demo.com   | 12345678 |

Mock data lives in memory. See `apps/web/lib/users/data.ts` for all available test users per tenant.

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

### Current Coverage

| Suite                        | Tests |
| ---------------------------- | ----- |
| Tickets — schemas            | 12    |
| Tickets — data layer         | 18    |
| Tickets — actions            | 17    |
| Tickets — thread lifecycle   | 16    |
| Messages — schemas           | 23    |
| Messages — data layer        | 14    |
| Messages — actions           | 13    |
| Tenants — schemas            | 19    |
| Tenants — data layer         | 11    |
| Tenants — actions            | 7     |
| Users — data layer           | 14    |
| Users — schemas              | 16    |
| **Total**                    | **180** |

Each layer is tested separately: schemas (Zod validation), data layer (CRUD & filters), and actions (schema + data integration).

---

## Architecture

### Multi-Tenancy

Tenant isolation happens at three levels:

1. **Routing** — All routes live under `/(tenant)/[tenantSlug]/`, the slug identifies the tenant
2. **Authentication** — JWT contains `tenantId` and `tenantSlug`, validated in middleware and Server Components
3. **Data** — All queries filter by `tenantId`, ensuring a tenant never sees another tenant's data

```
Request → Middleware (validate JWT) → RSC (getSession + guard) → Data Layer (filter by tenantId)
```

### Authentication

- Login via Server Action → validate credentials → generate JWT with `jose` → store in httpOnly cookie
- Middleware protects routes (`/dashboard`, `/chamados`, `/admin`)
- Server Components use `getSession()` as a guard before rendering
- Roles: `admin` (administrators) and `client`/`member` (end users)

### Server Actions

All mutations follow the same pattern:

```
FormData → Field extraction → Zod validation → Business logic → revalidatePath → Typed response
```

Client-side uses `useActionState` for loading feedback and per-field errors.

### In-Memory Data Persistence

Mock data stores use `globalThis` to survive Next.js dev hot-reloads:

```typescript
const globalStore = globalThis as unknown as { __myStore?: Store };
if (!globalStore.__myStore) {
  globalStore.__myStore = { items: [...SEED_DATA], nextId: 1 };
}
const store = globalStore.__myStore;
```

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
4. Messages exchanged            → polling every 3s via pollThreadMessages Server Action
5. Admin disconnects             → status: "pending_feedback", 24h deadline
6. Client gives feedback         → "Resolved" or "Not resolved"
7. Auto-close                    → If no response in 24h, auto-closes (check-on-access)
```

**Key features:**
- Token-based public access for clients (no login required)
- Branded per tenant (colors, logo from tenant theme)
- Real-time updates via 3-second polling (to be replaced with WebSocket in production)
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
- [x] Thread communication — real-time chat between admin and client
- [x] Public token-based access for clients (no auth required)
- [x] Admin disconnect + client feedback flow
- [x] Auto-close after 24h deadline (check-on-access pattern)
- [x] Polling-based real-time updates (3s interval)
- [x] globalThis persistence for dev hot-reload survival
- [x] Client dashboard with ticket list and filters
- [x] Client ticket creation form with Zod validation
- [x] 4 complete domains (tenants, tickets, users, messages)
- [x] 180 unit tests passing (strict TDD)
- [x] **Database** — Migrate mock data to Prisma + MongoDB

### 🔜 Next Steps

- [ ] **Real file uploads** — Integrate with S3/R2 (currently visual-only)
- [ ] **WebSocket/SSE** — Replace polling with real-time connection
- [ ] **Server-side pagination** — RSC with Suspense streaming
- [ ] **E2E tests** — Playwright for critical flows

### 🔮 Future

- [ ] CI/CD with GitHub Actions + Turbo remote cache
- [ ] Internationalization (i18n) with next-intl
- [ ] Rate limiting on Server Actions
- [ ] Observability — structured logging + metrics
- [ ] Granular role-based access control (RBAC)
- [ ] Email notifications for thread updates

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

### Turbopack Cache

When replacing files externally (outside the dev server), Turbopack may serve the old module version. Restart the dev server (`Ctrl+C` → `pnpm dev`) to force cache invalidation.

### npm Workspaces Alternative

When using npm instead of pnpm, replace `workspace:*` with `*` in each app/package's `package.json` dependencies.

---

## License

ISC
