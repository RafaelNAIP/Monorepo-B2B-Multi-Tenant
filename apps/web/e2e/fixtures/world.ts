import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@empresa/auth";

/**
 * Mundo determinístico dos testes E2E.
 *
 * IDs fixos (ObjectIds válidos) para que o storageState gerado no setup
 * continue válido após cada reset do banco: o cookie carrega o `sub` do usuário.
 */

/** Ponto de acesso único ao Prisma nos testes (Node, fora do Next). */
export const prisma = new PrismaClient();

export const DEFAULT_PASSWORD = "senha@123";

const oid = (n: number) => n.toString(16).padStart(24, "0");

// ─── Tenants ────────────────────────────────────────────────────
export const TENANT = {
  demo: { id: oid(0x10), slug: "demo", name: "Demo Corp" },
  acme: { id: oid(0x20), slug: "acme", name: "Acme Inc" },
} as const;

// ─── Usuários (mesmos e-mails do seed de desenvolvimento) ───────
export const USER = {
  adminDemo: { id: oid(0x11), tenant: "demo", email: "admin@demo.com", name: "João Admin", role: "admin" },
  clientDemo: { id: oid(0x12), tenant: "demo", email: "maria@demo.com", name: "Maria Oliveira", role: "client" },
  adminAcme: { id: oid(0x21), tenant: "acme", email: "admin@acme.com", name: "Carlos Santos", role: "admin" },
  clientAcme: { id: oid(0x22), tenant: "acme", email: "ana@acme.com", name: "Ana Costa", role: "client" },
} as const;

// ─── Chamados âncora (estado fixo, usado pelos specs) ───────────
export const TICKET = {
  open: { id: oid(0x101), code: "tkt_101", title: "Impressora do financeiro não imprime" },
  inProgress: { id: oid(0x102), code: "tkt_102", title: "Erro ao emitir nota fiscal" },
  pending: { id: oid(0x103), code: "tkt_103", title: "Sistema lento após atualização" },
  expired: { id: oid(0x104), code: "tkt_104", title: "Login intermitente no portal" },
  acme: { id: oid(0x201), code: "tkt_201", title: "Acesso ao sistema de RH" },
} as const;

/** Tokens de thread pública pré-criados (um por chamado que precisa de link pronto). */
export const THREAD_TOKEN = {
  pending: "e2e-token-pending-103",
  expired: "e2e-token-expired-104",
} as const;

/** Filler: 21 chamados extras para totalizar 25 no tenant demo (3 páginas de 10). */
const FILLER_STATUSES = ["open", "in_progress", "resolved", "closed", "pending_feedback"] as const;
const FILLER_COUNT = 21;

/**
 * Recria o banco com o mundo de teste. Chamado no início de cada spec
 * (beforeEach), pois os specs mutam o estado (assumir, encerrar, feedback).
 */
export async function resetWorld(): Promise<void> {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const now = Date.now();
  const inHours = (h: number) => new Date(now + h * 60 * 60 * 1000);

  await prisma.attachment.deleteMany();
  await prisma.threadAccess.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  await prisma.tenant.create({
    data: {
      id: TENANT.demo.id,
      name: TENANT.demo.name,
      slug: TENANT.demo.slug,
      subscription: "active",
      theme: { primaryColor: "#2563EB", borderRadius: 8, logoUrl: "https://placehold.co/120x40?text=Demo" },
    },
  });
  await prisma.tenant.create({
    data: {
      id: TENANT.acme.id,
      name: TENANT.acme.name,
      slug: TENANT.acme.slug,
      subscription: "active",
      theme: { primaryColor: "#059669", borderRadius: 12, logoUrl: "https://placehold.co/120x40?text=Acme" },
    },
  });

  for (const user of Object.values(USER)) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        tenantId: TENANT[user.tenant].id,
      },
    });
  }

  const base = {
    priority: "medium" as const,
    category: "ti" as const,
    description: "Descrição de teste E2E com conteúdo suficiente para validação.",
  };

  await prisma.ticket.create({
    data: { ...base, id: TICKET.open.id, code: TICKET.open.code, title: TICKET.open.title, requester: USER.clientDemo.name, status: "open", tenantId: TENANT.demo.id, category: "financeiro" },
  });
  await prisma.ticket.create({
    data: { ...base, id: TICKET.inProgress.id, code: TICKET.inProgress.code, title: TICKET.inProgress.title, requester: USER.clientDemo.name, status: "in_progress", tenantId: TENANT.demo.id, assignedTo: USER.adminDemo.id, category: "financeiro" },
  });
  await prisma.ticket.create({
    data: { ...base, id: TICKET.pending.id, code: TICKET.pending.code, title: TICKET.pending.title, requester: USER.clientDemo.name, status: "pending_feedback", tenantId: TENANT.demo.id, assignedTo: USER.adminDemo.id, disconnectedAt: new Date(now), feedbackDeadline: inHours(24) },
  });
  await prisma.ticket.create({
    data: { ...base, id: TICKET.expired.id, code: TICKET.expired.code, title: TICKET.expired.title, requester: USER.clientDemo.name, status: "pending_feedback", tenantId: TENANT.demo.id, assignedTo: USER.adminDemo.id, disconnectedAt: inHours(-25), feedbackDeadline: inHours(-1) },
  });
  await prisma.ticket.create({
    data: { ...base, id: TICKET.acme.id, code: TICKET.acme.code, title: TICKET.acme.title, requester: USER.clientAcme.name, status: "open", tenantId: TENANT.acme.id, category: "rh" },
  });

  for (let i = 0; i < FILLER_COUNT; i++) {
    await prisma.ticket.create({
      data: {
        ...base,
        id: oid(0x110 + i),
        code: `tkt_${String(110 + i)}`,
        title: `Chamado de apoio nº ${String(i + 1).padStart(2, "0")}`,
        requester: USER.clientDemo.name,
        status: FILLER_STATUSES[i % FILLER_STATUSES.length],
        tenantId: TENANT.demo.id,
        priority: (["high", "medium", "low"] as const)[i % 3],
      },
    });
  }

  await prisma.threadAccess.create({
    data: { ticketId: TICKET.pending.id, tenantId: TENANT.demo.id, token: THREAD_TOKEN.pending, clientName: USER.clientDemo.name, clientEmail: USER.clientDemo.email },
  });
  await prisma.threadAccess.create({
    data: { ticketId: TICKET.expired.id, tenantId: TENANT.demo.id, token: THREAD_TOKEN.expired, clientName: USER.clientDemo.name, clientEmail: USER.clientDemo.email },
  });
}
