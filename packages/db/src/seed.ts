import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Limpar dados existentes (ordem reversa de dependência) ────
  await prisma.attachment.deleteMany();
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

  console.log(
    `✅ Usuários criados: ${adminDemo.name}, ${clientDemo.name}, ${adminAcme.name}, ${clientAcme.name}`
  );

  // ─── 25 Tickets para Demo Corp ─────────────────────────────────
  // Distribuídos entre status, categorias, prioridades e solicitantes
  // para testar paginação (PAGE_SIZE = 10 → 3 páginas) e filtros.

  const statuses = [
    "open",
    "in_progress",
    "pending_feedback",
    "resolved",
    "closed",
  ] as const;

  const categories = [
    "suporte_tecnico",
    "financeiro",
    "ti",
    "rh",
    "comercial",
  ] as const;

  const priorities = ["high", "medium", "low"] as const;

  const requesters = [
    "Maria Oliveira",
    "Carlos Mendes",
    "Ana Paula Silva",
    "Roberto Almeida",
    "Fernanda Costa",
  ];

  const ticketData: Array<{
    title: string;
    description: string;
    category: (typeof categories)[number];
    status: (typeof statuses)[number];
    priority: (typeof priorities)[number];
    requester: string;
  }> = [
    {
      title: "Sistema de login não responde",
      description:
        "O sistema de login parou de funcionar após a última atualização.",
      category: "suporte_tecnico",
      status: "open",
      priority: "high",
      requester: "Maria Oliveira",
    },
    {
      title: "Erro no relatório financeiro mensal",
      description: "Os valores do relatório mensal estão divergindo do ERP.",
      category: "financeiro",
      status: "in_progress",
      priority: "medium",
      requester: "Maria Oliveira",
    },
    {
      title: "Solicitação de novo notebook",
      description: "Preciso de um notebook novo para o setor de marketing.",
      category: "ti",
      status: "open",
      priority: "low",
      requester: "Carlos Mendes",
    },
    {
      title: "Dúvida sobre holerite de outubro",
      description:
        "O desconto de INSS no holerite está diferente do esperado.",
      category: "rh",
      status: "resolved",
      priority: "medium",
      requester: "Ana Paula Silva",
    },
    {
      title: "Proposta comercial para cliente Xpto",
      description:
        "Preciso de ajuda para elaborar proposta com desconto especial.",
      category: "comercial",
      status: "open",
      priority: "high",
      requester: "Roberto Almeida",
    },
    {
      title: "Impressora do 3o andar não funciona",
      description: "A impressora HP do terceiro andar não imprime desde ontem.",
      category: "suporte_tecnico",
      status: "in_progress",
      priority: "high",
      requester: "Fernanda Costa",
    },
    {
      title: "Reembolso de despesas de viagem",
      description:
        "Viagem a São Paulo em setembro, preciso do reembolso das despesas.",
      category: "financeiro",
      status: "pending_feedback",
      priority: "medium",
      requester: "Carlos Mendes",
    },
    {
      title: "Acesso ao VPN corporativo",
      description: "Não consigo conectar no VPN desde a troca de senha.",
      category: "ti",
      status: "open",
      priority: "high",
      requester: "Ana Paula Silva",
    },
    {
      title: "Atualização de dados cadastrais",
      description: "Mudei de endereço e preciso atualizar no sistema.",
      category: "rh",
      status: "closed",
      priority: "low",
      requester: "Maria Oliveira",
    },
    {
      title: "Renovação de contrato com fornecedor",
      description:
        "O contrato com o fornecedor ABC vence no próximo mês.",
      category: "comercial",
      status: "in_progress",
      priority: "medium",
      requester: "Roberto Almeida",
    },
    {
      title: "E-mail corporativo fora do ar",
      description: "Não consigo enviar nem receber e-mails desde as 8h.",
      category: "suporte_tecnico",
      status: "open",
      priority: "high",
      requester: "Fernanda Costa",
    },
    {
      title: "Nota fiscal com valor incorreto",
      description:
        "A NF 12345 foi emitida com valor diferente do pedido de compra.",
      category: "financeiro",
      status: "open",
      priority: "medium",
      requester: "Carlos Mendes",
    },
    {
      title: "Instalação de software AutoCAD",
      description: "Preciso do AutoCAD instalado na minha estação de trabalho.",
      category: "ti",
      status: "resolved",
      priority: "low",
      requester: "Ana Paula Silva",
    },
    {
      title: "Solicitação de férias para dezembro",
      description:
        "Gostaria de agendar minhas férias para o período de 15 a 30/12.",
      category: "rh",
      status: "open",
      priority: "low",
      requester: "Roberto Almeida",
    },
    {
      title: "Orçamento para evento corporativo",
      description:
        "Precisamos de orçamento para o evento de fim de ano, 200 pessoas.",
      category: "comercial",
      status: "pending_feedback",
      priority: "medium",
      requester: "Fernanda Costa",
    },
    {
      title: "Computador reiniciando sozinho",
      description: "Meu computador reinicia aleatoriamente durante o dia.",
      category: "suporte_tecnico",
      status: "in_progress",
      priority: "high",
      requester: "Maria Oliveira",
    },
    {
      title: "Pagamento duplicado ao fornecedor",
      description:
        "O fornecedor XYZ recebeu pagamento duplicado na última remessa.",
      category: "financeiro",
      status: "resolved",
      priority: "high",
      requester: "Carlos Mendes",
    },
    {
      title: "Migração de servidor de arquivos",
      description:
        "O servidor de arquivos antigo precisa ser migrado para o novo storage.",
      category: "ti",
      status: "in_progress",
      priority: "medium",
      requester: "Ana Paula Silva",
    },
    {
      title: "Treinamento de integração para novos",
      description:
        "Precisamos agendar treinamento para 5 novos colaboradores.",
      category: "rh",
      status: "open",
      priority: "medium",
      requester: "Roberto Almeida",
    },
    {
      title: "Follow-up proposta cliente Delta",
      description:
        "O cliente Delta pediu revisão de preços na proposta enviada.",
      category: "comercial",
      status: "open",
      priority: "high",
      requester: "Fernanda Costa",
    },
    {
      title: "Wi-Fi lento no escritório",
      description:
        "A conexão Wi-Fi está muito lenta, especialmente no período da tarde.",
      category: "suporte_tecnico",
      status: "closed",
      priority: "medium",
      requester: "Maria Oliveira",
    },
    {
      title: "Conciliação bancária de setembro",
      description:
        "A conciliação bancária de setembro apresenta diferença de R$ 3.200.",
      category: "financeiro",
      status: "in_progress",
      priority: "high",
      requester: "Ana Paula Silva",
    },
    {
      title: "Licença do antivírus expirando",
      description:
        "As licenças do antivírus corporativo vencem em 15 dias.",
      category: "ti",
      status: "open",
      priority: "medium",
      requester: "Carlos Mendes",
    },
    {
      title: "Erro no cálculo de horas extras",
      description:
        "O sistema está calculando horas extras com base incorreta.",
      category: "rh",
      status: "pending_feedback",
      priority: "high",
      requester: "Fernanda Costa",
    },
    {
      title: "Apresentação comercial para feiras",
      description:
        "Precisamos de material atualizado para a feira de tecnologia.",
      category: "comercial",
      status: "resolved",
      priority: "low",
      requester: "Roberto Almeida",
    },
  ];

  // Criar os 25 tickets com datas espaçadas (1 por dia, do mais antigo ao mais novo)
  const baseDate = new Date("2026-10-01T09:00:00Z");

  for (let i = 0; i < ticketData.length; i++) {
    const t = ticketData[i];
    const createdAt = new Date(
      baseDate.getTime() + i * 24 * 60 * 60 * 1000
    );

    await prisma.ticket.create({
      data: {
        code: `tkt_${String(i + 1).padStart(3, "0")}`,
        title: t.title,
        requester: t.requester,
        status: t.status,
        priority: t.priority,
        category: t.category,
        description: t.description,
        tenantId: demo.id,
        assignedTo:
          t.status === "in_progress" || t.status === "pending_feedback"
            ? adminDemo.id
            : undefined,
        createdAt,
      },
    });
  }

  console.log(`✅ 25 tickets criados para ${demo.name}`);

  // ─── 1 Ticket para Acme (isolamento multi-tenant) ─────────────
  await prisma.ticket.create({
    data: {
      code: "tkt_100",
      title: "Solicitação de novo monitor",
      requester: clientAcme.name,
      status: "open",
      priority: "low",
      category: "ti",
      description: "Preciso de um monitor extra para trabalho com planilhas.",
      tenantId: acme.id,
    },
  });

  console.log(`✅ 1 ticket criado para ${acme.name}`);

  // ─── Mensagens de exemplo ──────────────────────────────────────
  // Pegar o ticket "Erro no relatório financeiro mensal" (tkt_002)
  const ticket2 = await prisma.ticket.findUnique({
    where: { code: "tkt_002" },
  });

  if (ticket2) {
    await prisma.message.create({
      data: {
        ticketId: ticket2.id,
        tenantId: demo.id,
        senderRole: "client",
        senderName: clientDemo.name,
        content:
          "Os valores do relatório mensal estão divergindo do ERP. Podem verificar?",
      },
    });

    await prisma.message.create({
      data: {
        ticketId: ticket2.id,
        tenantId: demo.id,
        senderRole: "admin",
        senderName: adminDemo.name,
        content:
          "Boa tarde! Estou verificando o relatório agora. Já identifiquei uma possível causa.",
      },
    });

    await prisma.threadAccess.create({
      data: {
        ticketId: ticket2.id,
        tenantId: demo.id,
        clientName: clientDemo.name,
        clientEmail: clientDemo.email,
        token: crypto.randomUUID(),
      },
    });
  }

  console.log("✅ Mensagens e thread access de exemplo criados");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("   → 25 chamados no tenant Demo (3 páginas com pageSize=10)");
  console.log("   → 1 chamado no tenant Acme");
  console.log("   → Distribuição: 9 open, 6 in_progress, 3 pending_feedback, 4 resolved, 3 closed");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
