// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/demo/dashboard",
}));

import { TicketList } from "@/app/(tenant)/[tenantSlug]/dashboard/ticket-list";

const TICKETS = [
  {
    id: "tkt_1",
    title: "Sistema de login não responde",
    requester: "Maria Oliveira",
    status: "open",
    priority: "high",
    category: "suporte_tecnico",
  },
  {
    id: "tkt_2",
    title: "Erro no relatório financeiro",
    requester: "Carlos Santos",
    status: "in_progress",
    priority: "medium",
    category: "financeiro",
  },
] as never;

afterEach(cleanup);

beforeEach(() => {
  replaceMock.mockReset();
  vi.useFakeTimers();
});

describe("TicketList (dashboard) com paginação server-side", () => {
  it("renderiza exatamente os chamados recebidos, sem filtrar de novo no cliente", () => {
    render(
      createElement(TicketList, {
        tickets: TICKETS,
        tenantSlug: "demo",
        initialSearch: "zzz-nao-bate-com-nada",
      })
    );

    expect(screen.getByText("Sistema de login não responde")).toBeTruthy();
    expect(screen.getByText("Erro no relatório financeiro")).toBeTruthy();
  });

  it("mudar o status atualiza a URL (volta para a página 1)", () => {
    render(createElement(TicketList, { tickets: TICKETS, tenantSlug: "demo" }));

    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "open" },
    });

    expect(replaceMock).toHaveBeenCalledWith("/demo/dashboard?status=open", {
      scroll: false,
    });
  });

  it("escolher 'todos os status' remove o parâmetro status da URL", () => {
    render(
      createElement(TicketList, {
        tickets: TICKETS,
        tenantSlug: "demo",
        initialStatus: "open",
      })
    );

    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "todos" },
    });

    expect(replaceMock).toHaveBeenCalledWith("/demo/dashboard", { scroll: false });
  });

  it("digitar na busca atualiza a URL só depois de parar de digitar (debounce)", () => {
    render(createElement(TicketList, { tickets: TICKETS, tenantSlug: "demo" }));
    const input = screen.getByPlaceholderText(/Buscar por título ou solicitante/);

    fireEvent.change(input, { target: { value: "e" } });
    fireEvent.change(input, { target: { value: "er" } });
    fireEvent.change(input, { target: { value: "erro" } });
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/demo/dashboard?search=erro", {
      scroll: false,
    });
  });

  it("mudar o status enquanto a busca está pendente não deixa a busca antiga sobrescrever o filtro", () => {
    render(createElement(TicketList, { tickets: TICKETS, tenantSlug: "demo" }));

    fireEvent.change(screen.getByPlaceholderText(/Buscar por título ou solicitante/), {
      target: { value: "erro" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por status"), {
      target: { value: "open" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/demo/dashboard?status=open&search=erro", {
      scroll: false,
    });
  });

  it("mostra mensagem de vazio quando a página atual não tem chamados", () => {
    render(createElement(TicketList, { tickets: [], tenantSlug: "demo" }));

    expect(screen.getByText("Nenhum chamado encontrado.")).toBeTruthy();
  });
});
