import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Limpar dados existentes (ordem reversa de dependência) ────
  await prisma.threadAccess.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ─── Tenants ───────────────────────────────────────────────────
  const demo = await prisma.tenant.create({
    data: {
      name: "Demo Corp",
      slug: "demo",
      subscription: "active",
      theme: {
        primaryColor: "#2563EB",
        borderRadius: 8,
        logoUrl: "https://placehold.co/120x40?text=Demo",
      },
    },
  });

  const acme = await prisma.tenant.create({
    data: {
      name: "Acme Inc",
      slug: "acme",
      subscription: "active",
      theme: {
        primaryColor: "#059669",
        borderRadius: 12,
        logoUrl: "https://placehold.co/120x40?text=Acme",
      },
    },
  });

  console.log(`✅ Tenants criados: ${demo.name}, ${acme.name}`);

  // ─── Users ─────────────────────────────────────────────────────
  const adminDemo = await prisma.user.create({
    data: {
      name: "João Admin",
      email: "admin@demo.com",
      role: "admin",
      tenantId: demo.id,
    },
  });

  const clientDemo = await prisma.user.create({
    data: {
      name: "Maria Oliveira",
      email: "maria@demo.com",
      role: "client",
      tenantId: demo.id,
    },
  });

  const adminAcme = await prisma.user.create({
    data: {
      name: "Carlos Santos",
      email: "admin@acme.com",
      role: "admin",
      tenantId: acme.id,
    },
  });

  const clientAcme = await prisma.user.create({
    data: {
      name: "Ana Costa",
      email: "ana@acme.com",
      role: "client",
      tenantId: acme.id,
    },
  });

  console.log(`✅ Usuários criados: ${adminDemo.name}, ${clientDemo.name}, ${adminAcme.name}, ${clientAcme.name}`);

  // ─── Tickets ───────────────────────────────────────────────────
  const ticket1 = await prisma.ticket.create({
    data: {
      code: "tkt_001",
      title: "Sistema de login não responde",
      requester: clientDemo.name,
      status: "open",
      priority: "high",
      category: "suporte_tecnico",
      description: "O sistema de login parou de funcionar após a última atualização.",
      tenantId: demo.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      code: "tkt_002",
      title: "Erro no relatório financeiro mensal",
      requester: clientDemo.name,
      status: "in_progress",
      priority: "medium",
      category: "financeiro",
      description: "Os valores do relatório mensal estão divergindo do ERP.",
      tenantId: demo.id,
      assignedTo: adminDemo.id,
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      code: "tkt_003",
      title: "Solicitação de novo monitor",
      requester: clientAcme.name,
      status: "open",
      priority: "low",
      category: "ti",
      description: "Preciso de um monitor extra para trabalho com planilhas.",
      tenantId: acme.id,
    },
  });

  console.log(`✅ Tickets criados: ${ticket1.code}, ${ticket2.code}, ${ticket3.code}`);

  // ─── Messages ──────────────────────────────────────────────────
  await prisma.message.create({
    data: {
      ticketId: ticket2.id,
      tenantId: demo.id,
      senderRole: "client",
      senderName: clientDemo.name,
      content: "Os valores do relatório mensal estão divergindo do ERP. Podem verificar?",
    },
  });

  await prisma.message.create({
    data: {
      ticketId: ticket2.id,
      tenantId: demo.id,
      senderRole: "admin",
      senderName: adminDemo.name,
      content: "Boa tarde! Estou verificando o relatório agora. Já identifiquei uma possível causa.",
    },
  });

  console.log("✅ Mensagens de exemplo criadas");

  // ─── Thread Access ─────────────────────────────────────────────
  await prisma.threadAccess.create({
    data: {
      ticketId: ticket2.id,
      tenantId: demo.id,
      clientName: clientDemo.name,
      clientEmail: clientDemo.email,
      token: crypto.randomUUID(),
    },
  });

  console.log("✅ Thread access de exemplo criado");

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
