import { describe, it, expect, vi } from "vitest";

import { InMemoryChannel } from "../../lib/sse/channel-in-memory";
import { RedisChannel } from "../../lib/sse/channel-redis";
import type { ThreadEventChannel } from "../../lib/sse/channel";

/**
 * Testa o contrato ThreadEventChannel com ambos os adaptadores.
 * Enquanto o Redis não está conectado, o RedisChannel usa fallback local,
 * então os dois adaptadores devem passar exatamente os mesmos testes.
 */
function channelSuite(name: string, create: () => ThreadEventChannel) {
  describe(name, () => {
    it("entrega evento para subscriber inscrito", () => {
      const ch = create();
      const spy = vi.fn();

      ch.subscribe("tkt_1", spy);
      ch.publish("tkt_1", { type: "new_message", timestamp: 1 });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith({
        type: "new_message",
        ticketId: "tkt_1",
        timestamp: 1,
      });
    });

    it("não entrega evento de outro ticket", () => {
      const ch = create();
      const spy = vi.fn();

      ch.subscribe("tkt_A", spy);
      ch.publish("tkt_B", { type: "new_message", timestamp: 1 });

      expect(spy).not.toHaveBeenCalled();
    });

    it("entrega para múltiplos subscribers do mesmo ticket", () => {
      const ch = create();
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      ch.subscribe("tkt_1", spy1);
      ch.subscribe("tkt_1", spy2);
      ch.publish("tkt_1", { type: "ticket_updated", timestamp: 2 });

      expect(spy1).toHaveBeenCalledOnce();
      expect(spy2).toHaveBeenCalledOnce();
    });

    it("unsubscribe remove o subscriber", () => {
      const ch = create();
      const spy = vi.fn();

      const unsub = ch.subscribe("tkt_1", spy);
      unsub();
      ch.publish("tkt_1", { type: "new_message", timestamp: 1 });

      expect(spy).not.toHaveBeenCalled();
    });

    it("subscriberCount reflete inscrições e cancelamentos", () => {
      const ch = create();

      expect(ch.subscriberCount("tkt_1")).toBe(0);

      const unsub1 = ch.subscribe("tkt_1", () => {});
      const unsub2 = ch.subscribe("tkt_1", () => {});
      expect(ch.subscriberCount("tkt_1")).toBe(2);

      unsub1();
      expect(ch.subscriberCount("tkt_1")).toBe(1);

      unsub2();
      expect(ch.subscriberCount("tkt_1")).toBe(0);
    });

    it("subscriber que lança erro não afeta outros", () => {
      const ch = create();
      const failing = vi.fn(() => {
        throw new Error("boom");
      });
      const ok = vi.fn();

      ch.subscribe("tkt_1", failing);
      ch.subscribe("tkt_1", ok);
      ch.publish("tkt_1", { type: "new_message", timestamp: 1 });

      expect(failing).toHaveBeenCalledOnce();
      expect(ok).toHaveBeenCalledOnce();
    });

    it("publish sem subscribers não lança erro", () => {
      const ch = create();
      expect(() =>
        ch.publish("tkt_none", { type: "new_message", timestamp: 1 })
      ).not.toThrow();
    });
  });
}

// ── Rodar o contrato para ambos os adaptadores ──

channelSuite("InMemoryChannel", () => new InMemoryChannel());
channelSuite("RedisChannel (fallback local)", () => new RedisChannel());
