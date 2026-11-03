// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/demo/admin/chamados",
}));

vi.mock("@/lib/tickets/actions", () => ({
  assignTicketAction: vi.fn(),
}));

import { AdminTicketTable } from "@/app/(tenant)/[tenantSlug]/admin/chamados/admin-ticket-table";

const TICKETS = [
  {
    id: "tkt_1",
    title: "Sistema de login não responde",
    requester: "Maria Oliveira",
    status: "open",
    priority: "high",
    category: "suporte_tecnico",
    createdAt: "2026-11-01T10:00:00Z",
    assignedTo: null,
  },
  {
    id: "tkt_2",
    title: "Erro no relatório financeiro",
    requester: "Carlos Santos",
    status: "in_progress",
    priority: "medium",
    category: "financeiro",
    createdAt: "2026-11-02T10:00:00Z",
    assignedTo: "u_01",
  },
] as never;

const BASE_PROPS = {
  tickets: TICKETS,
  assignedNames: { u_01: "João" },
  adminUserId: "u_admin",
  tenantSlug: "demo",
};

afterEach(cleanup);

beforeEach(() => {
  replaceMock.mockReset();
  vi.useFakeTimers();
});

describe("AdminTicketTable com paginação server-side", () => {
  it("renderiza exatamente os chamados recebidos, sem filtrar de novo no cliente", () => {
    render(
      createElement(AdminTicketTable, { ...BASE_PROPS, initialSearch: "zzz-nao-bate" })
    );

    expect(screen.getByText("Sistema de login não responde")).toBeTruthy();
    expect(screen.getByText("Erro no relatório financeiro")).toBeTruthy();
  });

  it("mudar o status atualiza a URL com o status escolhido", () => {
    render(createElement(AdminTicketTable, BASE_PROPS));

    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "in_progress" },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/demo/admin/chamados?status=in_progress",
      { scroll: false }
    );
  });

  it("digitar na busca atualiza a URL depois do debounce, sem repetir a cada tecla", () => {
    render(createElement(AdminTicketTable, BASE_PROPS));
    const input = screen.getByLabelText("Buscar chamados");

    fireEvent.change(input, { target: { value: "fin" } });
    fireEvent.change(input, { target: { value: "finan" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/demo/admin/chamados?search=finan", {
      scroll: false,
    });
  });

  it("mostra mensagem de vazio quando a página atual não tem chamados", () => {
    render(createElement(AdminTicketTable, { ...BASE_PROPS, tickets: [] }));

    expect(screen.getByText("Nenhum chamado encontrado para esta empresa.")).toBeTruthy();
  });
});
