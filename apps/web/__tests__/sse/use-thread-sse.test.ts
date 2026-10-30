// @vitest-environment jsdom
import { createElement, StrictMode, type ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import type { Message } from "../../lib/messages/types";
import type { Ticket } from "../../lib/tickets/types";
import { FakeEventSource } from "./helpers/fake-event-source";

// Fronteira do servidor: a Server Action depende de Prisma. Aqui ela é
// substituída por uma fonte em memória; o que se testa é a ligação
// hook ↔ controlador ↔ estado React. A cadeia real (emitter, route, parser,
// controlador) está em sse-integration.test.ts.
const store: { messages: Message[]; ticket: Ticket | null } = {
  messages: [],
  ticket: null,
};
const pollThreadMessages = vi.fn(async (_ticketId: string) => ({
  messages: [...store.messages],
  ticket: store.ticket,
}));
vi.mock("@/lib/messages/actions", () => ({
  pollThreadMessages: (id: string) => pollThreadMessages(id),
}));

import { useThreadSSE } from "../../hooks/use-thread-sse";

const msg = (id: string, content: string): Message =>
  ({ id, ticketId: "tkt_1", content }) as Message;
const ticketOf = (status: string, id = "tkt_1"): Ticket =>
  ({ id, status }) as unknown as Ticket;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  store.messages = [];
  store.ticket = null;
  pollThreadMessages.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useThreadSSE", () => {
  it("devolve o estado inicial vindo do servidor e abre o canal do ticket", () => {
    const initialMessages = [msg("1", "oi")];
    const { result } = renderHook(() =>
      useThreadSSE(ticketOf("OPEN"), initialMessages)
    );

    expect(result.current.messages).toEqual(initialMessages);
    expect(result.current.ticket.status).toBe("OPEN");
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.last.url).toBe("/api/threads/tkt_1/events");
    expect(pollThreadMessages).not.toHaveBeenCalled();
  });

  it("atualiza mensagens e ticket quando chega um evento", async () => {
    const { result } = renderHook(() => useThreadSSE(ticketOf("OPEN"), []));
    await act(async () => FakeEventSource.last.open());
    await flush();

    store.messages = [msg("1", "oi"), msg("2", "tudo bem?")];
    store.ticket = ticketOf("IN_PROGRESS");
    await act(async () => FakeEventSource.last.emit("new_message"));
    await flush();

    expect(result.current.messages.map((m) => m.content)).toEqual(["oi", "tudo bem?"]);
    expect(result.current.ticket.status).toBe("IN_PROGRESS");
    expect(pollThreadMessages).toHaveBeenLastCalledWith("tkt_1");
  });

  it("mantém o ticket anterior quando a atualização vem sem ticket", async () => {
    const { result } = renderHook(() => useThreadSSE(ticketOf("OPEN"), []));
    await act(async () => FakeEventSource.last.open());
    await flush();

    store.messages = [msg("1", "nova")];
    store.ticket = null;
    await act(async () => FakeEventSource.last.emit("new_message"));
    await flush();

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.ticket.status).toBe("OPEN");
  });

  it("rerender com o mesmo ticket não reabre a conexão", () => {
    const { rerender } = renderHook(
      ({ t }) => useThreadSSE(t, []),
      { initialProps: { t: ticketOf("OPEN") } }
    );

    rerender({ t: ticketOf("IN_PROGRESS") }); // mesmo id, objeto novo (ex.: re-render do pai)

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.last.closed).toBe(false);
  });

  it("ao desmontar fecha a conexão e ignora respostas atrasadas", async () => {
    let release!: () => void;
    pollThreadMessages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ messages: [msg("9", "tarde")], ticket: ticketOf("CLOSED") });
        })
    );
    const { result, unmount } = renderHook(() => useThreadSSE(ticketOf("OPEN"), []));
    const es = FakeEventSource.last;
    await act(async () => es.open()); // dispara fetch pendente

    unmount();
    expect(es.closed).toBe(true);

    await act(async () => release());
    expect(result.current.messages).toEqual([]);
  });

  it("sobrevive ao StrictMode (efeito montado/desmontado/montado): fica exatamente uma conexão aberta e funcional", async () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result } = renderHook(() => useThreadSSE(ticketOf("OPEN"), []), { wrapper });

    const open = FakeEventSource.instances.filter((i) => !i.closed);
    expect(open).toHaveLength(1);

    store.messages = [msg("1", "oi")];
    await act(async () => open[0].open());
    await flush();
    expect(result.current.messages).toHaveLength(1);
  });

  it("cai para polling quando o SSE falha repetidamente e o estado continua atualizando", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useThreadSSE(ticketOf("OPEN"), []));
      const es = FakeEventSource.last;
      store.messages = [msg("1", "via polling")];

      act(() => { es.fail(); es.fail(); es.fail(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

      expect(result.current.messages.map((m) => m.content)).toEqual(["via polling"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("trocar de ticket fecha o canal antigo e abre o novo", () => {
    const { rerender } = renderHook(
      ({ id }) => useThreadSSE(ticketOf("OPEN", id), []),
      { initialProps: { id: "tkt_1" } }
    );
    const first = FakeEventSource.last;

    rerender({ id: "tkt_2" });

    expect(first.closed).toBe(true);
    expect(FakeEventSource.last.url).toBe("/api/threads/tkt_2/events");
  });
});
