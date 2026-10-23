# Monorepo B2B Multi-Tenant

Plataforma web corporativa modular B2B multi-tenant contendo painel administrativo, portal do cliente e um pacote compartilhado de UI components (Design System desacoplado), rodando sob um monorepo moderno.

> **Status:** MVP em desenvolvimento ativo — dados em memória (mock), sem banco de dados ainda.

---

## Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Setup](#instalação-e-setup)
- [Rodando o Projeto](#rodando-o-projeto)
- [Testes](#testes)
- [Arquitetura](#arquitetura)
- [Fluxos da Aplicação](#fluxos-da-aplicação)
- [Design System](#design-system)
- [Convenções do Projeto](#convenções-do-projeto)
- [Status Atual e Roadmap](#status-atual-e-roadmap)
- [Problemas Conhecidos](#problemas-conhecidos)
- [Licença](#licença)

---

## Visão Geral

O projeto resolve o desafio de construir uma plataforma SaaS B2B onde múltiplas empresas (tenants) compartilham a mesma aplicação mas possuem dados, branding e permissões completamente isolados.

### Desafio Técnico

- Contratos estritos de interface e tipagem compartilhada ponta a ponta
- React Server Components (RSC) com Server Actions seguras validadas por Zod
- Streaming de UI com Suspense para métricas pesadas
- Tokens de acessibilidade (WCAG 2.1 AA) sem dependência de CSS-in-JS legado
- Isolamento multi-tenant no roteamento, dados e autenticação

---

## Stack Tecnológica

| Camada         | Tecnologia                                     |
| -------------- | ---------------------------------------------- |
| Monorepo       | Turborepo + pnpm workspaces                    |
| Runtime        | Node.js ≥ 20, pnpm 9.12+                      |
| Framework      | Next.js 15 (App Router, Turbopack)             |
| Linguagem      | TypeScript 5.6+ (strict mode)                  |
| Validação      | Zod 3.x (`^3.23.0`)                           |
| Componentes UI | Radix UI + Class Variance Authority + Tailwind |
| Autenticação   | jose (JWT) + cookies httpOnly                  |
| Testes         | Vitest (workspace mode, TDD obrigatório)       |
| Estilização    | CSS Custom Properties (design tokens)          |

---

## Estrutura do Monorepo

```
monorepo-empresa/
├── apps/
│   └── web/                          # Next.js 15 App principal
│       ├── app/
│       │   └── (tenant)/
│       │       └── [tenantSlug]/
│       │           ├── admin/        # Painel administrativo
│       │           │   ├── chamados/ # Gestão de chamados (tickets)
│       │           │   └── tema/     # Configuração de marca/tema
│       │           └── auth/         # Tela de login
│       ├── lib/
│       │   ├── tenants/              # Domínio: Tenants
│       │   ├── tickets/              # Domínio: Chamados
│       │   └── users/                # Domínio: Usuários
│       ├── __tests__/                # Testes organizados por domínio
│       └── middleware.ts             # Proteção de rotas
├── packages/
│   ├── ui/                           # @empresa/ui — Design System
│   └── auth/                         # @empresa/auth — Autenticação JWT
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Convenção de Domínio (5 arquivos)

Cada domínio de negócio (`tickets`, `tenants`, `users`) segue uma estrutura fixa:

```
lib/<domínio>/
├── constants.ts   # Enums e constantes tipadas
├── types.ts       # Interfaces do domínio
├── schemas.ts     # Schemas Zod de validação
├── data.ts        # Data layer (CRUD, queries)
└── actions.ts     # Server Actions (formulários)
```

---

## Pré-requisitos

- **Node.js** ≥ 20
- **pnpm** ≥ 9.12 (`npm install -g pnpm`)
- **Git**

> **Windows:** Ativar Developer Mode para symlinks, ou configurar o `.npmrc` conforme a seção [Problemas Conhecidos](#problemas-conhecidos).

---

## Instalação e Setup

```bash
# 1. Clonar o repositório
git clone https://github.com/RafaelNAIP/Monorepo-B2B-Multi-Tenant.git
cd Monorepo-B2B-Multi-Tenant

# 2. Instalar dependências
pnpm install

# 3. (Windows) Caso tenha problemas com symlinks, criar .npmrc na raiz:
echo "node-linker=hoisted" >> .npmrc
echo "shamefully-hoist=true" >> .npmrc
pnpm install
```

---

## Rodando o Projeto

```bash
# Rodar todos os apps em modo de desenvolvimento
pnpm dev

# Rodar apenas o app web
pnpm dev --filter=@empresa/web

# Build de produção
pnpm build

# Verificação de tipos
pnpm type-check
```

O app estará disponível em `http://localhost:3000`.

### URLs de Exemplo

| Rota                          | Descrição                        |
| ----------------------------- | -------------------------------- |
| `/demo/auth`                  | Login do tenant "demo"           |
| `/demo/admin`                 | Painel admin — lista de tenants  |
| `/demo/admin/chamados`        | Gestão de chamados               |
| `/demo/admin/tema`            | Configuração de marca/tema       |

### Credenciais de Teste

Os dados de teste estão em memória (mock). Consulte `apps/web/lib/users/data.ts` para ver os usuários disponíveis por tenant.

---

## Testes

O projeto segue **TDD rigoroso** — testes são escritos antes da implementação.

```bash
# Rodar todos os testes
npx vitest run

# Rodar em modo watch
npx vitest

# Rodar testes de um domínio específico
npx vitest run __tests__/tickets

# Rodar com verbose
npx vitest run --reporter=verbose
```

### Cobertura Atual

| Suíte                  | Testes |
| ---------------------- | ------ |
| Tickets — schemas      | 12     |
| Tickets — data layer   | 18     |
| Tickets — actions      | 17     |
| Tenants — schemas      | 14     |
| Tenants — data layer   | 15     |
| Tenants — actions      | 7      |
| Users — data layer     | 14     |
| Users — schemas        | 17     |
| **Total**              | **114** |

Cada camada é testada separadamente: schemas (validação Zod), data layer (CRUD e filtros) e actions (integração schema + data).

---

## Arquitetura

### Multi-Tenancy

O isolamento por tenant acontece em três níveis:

1. **Roteamento** — Todas as rotas vivem sob `/(tenant)/[tenantSlug]/`, o slug identifica o tenant
2. **Autenticação** — JWT contém `tenantId` e `tenantSlug`, validado no middleware e nos Server Components
3. **Dados** — Todas as queries filtram por `tenantId`, garantindo que um tenant nunca veja dados de outro

```
Requisição → Middleware (valida JWT) → RSC (getSession + guard) → Data Layer (filtra por tenantId)
```

### Autenticação

- Login via Server Action → valida credenciais → gera JWT com `jose` → armazena em cookie httpOnly
- Middleware protege rotas (`/dashboard`, `/chamados`, `/admin`)
- Server Components usam `getSession()` como guard antes de renderizar
- Roles: `admin` (administradores) e `client`/`member` (clientes)

### Server Actions

Todas as mutações seguem o mesmo padrão:

```
FormData → Extração de campos → Validação Zod → Lógica de negócio → revalidatePath → Retorno tipado
```

Usam `useActionState` no client para feedback de loading e erros por campo.

---

## Fluxos da Aplicação

### Fluxo do Admin

```
Login → Painel Admin
         ├── Tenants (listagem com filtros de texto e assinatura)
         ├── Chamados (listagem, filtros, botão "Assumir" para tickets abertos)
         └── Configuração de Marca (editor de tema: cores, logo, border-radius)
```

**Chamados:**
- O admin vê todos os chamados de todos os tenants da empresa
- Chamados com status "Aberto" exibem o botão **Assumir**
- Ao assumir, o chamado muda para "Em andamento" e fica atribuído ao admin
- Filtros disponíveis: busca por texto (título, solicitante, categoria) e filtro por status

**Tenants:**
- Listagem com busca por nome/slug e filtro por tipo de assinatura (Ativa, Inativa, Trial)
- Cada tenant exibe nome, slug, plano de assinatura e status

**Tema:**
- Editor visual para personalização da marca do tenant
- Campos: nome da empresa, cor primária, cor secundária, logo URL, border-radius

### Fluxo do Cliente *(em construção)*

```
Login → Dashboard → Chamados (criar, acompanhar status)
```

---

## Design System

O pacote `@empresa/ui` fornece componentes headless acessíveis, estilizados com Tailwind CSS e CSS Custom Properties.

### Componentes Disponíveis

| Componente | Descrição                                          |
| ---------- | -------------------------------------------------- |
| `Button`   | Variantes: default, destructive, outline, ghost     |
| `Input`    | Com suporte a `error` e `aria-invalid`             |
| `Label`    | Baseado em Radix Label                             |
| `Badge`    | Variantes para status, prioridade e assinatura      |
| `Table`    | Tabela semântica (Table, TableHeader, TableRow...)  |
| `Dialog`   | Modal acessível baseado em Radix Dialog            |
| `Select`   | Dropdown baseado em Radix Select                   |
| `Textarea` | Área de texto com suporte a erro                   |

### Uso

```tsx
import { Button, Badge, Input } from "@empresa/ui";

<Badge variant="open">Aberto</Badge>
<Badge variant="high">Alta</Badge>
<Badge variant="active">Ativa</Badge>
```

### Variantes do Badge

| Grupo       | Variantes                                |
| ----------- | ---------------------------------------- |
| Status      | `open`, `in_progress`, `resolved`        |
| Prioridade  | `high`, `medium`, `low`                  |
| Assinatura  | `active`, `inactive`, `trial`            |

---

## Convenções do Projeto

### Idioma

| Contexto                         | Idioma      | Exemplo                                     |
| -------------------------------- | ----------- | ------------------------------------------- |
| Tipos, variáveis, funções        | Inglês      | `Ticket`, `getTickets()`, `assignedTo`      |
| Labels de UI, mensagens de erro  | Português   | `"Título deve ter ao menos 5 caracteres"`   |
| Nomes de teste (describe/it)     | Português   | `"rejeita categoria inválida"`              |
| Nomes de arquivo                 | Inglês      | `admin-ticket-table.tsx`                    |

### Padrões de Código

- **TypeScript strict mode** — sem `any`, sem `@ts-ignore`
- **Zod 3.x** — Zod 4 quebra `errorMap` em `z.enum()`, não usar
- **forwardRef + CVA + cn()** — padrão obrigatório para componentes UI
- **Server Components** — data fetching e auth guards ficam no RSC
- **Client Components** — apenas para interatividade (formulários, filtros, estados)
- **CSS Custom Properties** — design tokens via `var(--color-*)`, sem CSS-in-JS

### Metodologia TDD

O ciclo Red → Green → Refactor é obrigatório para toda feature nova:

1. Escrever testes que falham (Red)
2. Implementar o código mínimo para passar (Green)
3. Refatorar sem quebrar testes (Refactor)
4. Rodar a suíte completa antes de fechar a tarefa

---

## Status Atual e Roadmap

### ✅ Concluído (MVP Mock)

- [x] Monorepo Turborepo com pnpm workspaces
- [x] Autenticação multi-tenant (JWT + cookies httpOnly)
- [x] Middleware de proteção de rotas
- [x] Design System base com 8 componentes (`@empresa/ui`)
- [x] Painel admin — listagem de tenants com filtros (texto + assinatura)
- [x] Painel admin — configuração de marca/tema
- [x] Painel admin — navegação com highlight de página ativa
- [x] Sistema de chamados — criação, listagem e filtros
- [x] Sistema de chamados — atribuição pelo admin ("Assumir")
- [x] 114 testes unitários passando (TDD)
- [x] 3 domínios completos (tenants, tickets, users)

### 🔜 Próximos Passos

- [ ] Thread de comunicação — Chat entre admin e cliente dentro do chamado
- [ ] Dashboard do cliente — Portal com criação e acompanhamento de chamados
- [ ] Banco de dados — Migrar mock data para Prisma + PostgreSQL
- [ ] Upload de anexos — Integrar com S3/R2
- [ ] Paginação server-side — RSC com streaming via Suspense

### 🔮 Futuro

- [ ] Testes E2E com Playwright
- [ ] CI/CD com GitHub Actions + Turbo remote cache
- [ ] Internacionalização (i18n) com next-intl
- [ ] Rate limiting em Server Actions
- [ ] Observabilidade — logging estruturado + métricas
- [ ] Role-based access control (RBAC) granular

---

## Problemas Conhecidos

### pnpm no Windows (Symlinks)

Windows sem Developer Mode não suporta symlinks. Adicione ao `.npmrc` na raiz:

```ini
node-linker=hoisted
shamefully-hoist=true
```

Se `Cannot find module 'next'` persistir, delete todos os `node_modules` e o `pnpm-lock.yaml` e reinstale.

### Zod 3 vs Zod 4

O projeto usa **Zod 3.x** (`^3.23.0`). Não instale Zod 4 — ele ignora `errorMap` customizado em `z.enum()`, quebrando todas as mensagens de erro em português.

### Turbopack Cache

Ao substituir arquivos externamente (fora do dev server), o Turbopack pode servir a versão antiga do módulo. Reinicie o dev server (`Ctrl+C` → `pnpm dev`) para forçar a invalidação do cache.

---

## Licença

ISC
