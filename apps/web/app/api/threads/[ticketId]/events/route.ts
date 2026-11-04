import { threadChannel } from "@/lib/sse/channel-singleton";
import type { ThreadEvent } from "@/lib/sse/channel";
import {
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_DELAY_MS,
  REMOTE_SYNC_INTERVAL_MS,
} from "@/lib/sse/constants";
import { startRemoteSync } from "@/lib/sse/remote-sync";
import { resolveThreadActor } from "@/lib/messages/actor";

// SSE precisa do runtime Node (stream de longa duração) e nunca pode ser cacheado.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Duração máxima da função na Vercel (segundos).
 * No Fluid Compute a instância segura múltiplas conexões concorrentes,
 * mas o stream morre ao atingir esse limite — o createThreadSync reconecta
 * automaticamente e revalida o ator na nova conexão.
 *
 * Pro: 60s (padrão) | Enterprise: até 900s.
 * 60s é o máximo do plano Pro; subir quando o plano permitir.
 */
export const maxDuration = 60;

const encoder = new TextEncoder();

function formatEvent(event: ThreadEvent): string {
  return `id: ${event.timestamp}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Canal de notificação da thread. Não carrega dados da mensagem: apenas avisa
 * que algo mudou, e o cliente busca o estado atualizado via Server Action.
 *
 * Autenticação: sessão de admin (cookie) ou token de thread (query param `?token=`).
 * EventSource do browser não suporta headers customizados, por isso o token vai na URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
): Promise<Response> {
  const { ticketId } = await params;

  // ── Auth: sessão ou token de thread ──
  const url = new URL(request.url);
  const threadToken = url.searchParams.get("token");

  const auth = await resolveThreadActor(ticketId, threadToken);
  if (!auth.ok) {
    return Response.json(
      { error: auth.message },
      { status: auth.status }
    );
  }

  // ── Stream SSE ──
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let unsubscribe: (() => void) | undefined;
      let stopRemote: () => void = () => {};

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        stopRemote();
        request.signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          // stream já encerrado pelo consumidor
        }
      };

      const onAbort = () => cleanup();

      if (request.signal.aborted) {
        cleanup();
        return;
      }
      request.signal.addEventListener("abort", onAbort);

      unsubscribe = threadChannel.subscribe(ticketId, (event) =>
        send(formatEvent(event))
      );
      // Eventos publicados por outras instâncias (só com Redis configurado)
      stopRemote = startRemoteSync(
        threadChannel,
        ticketId,
        (event) => send(formatEvent(event)),
        { intervalMs: REMOTE_SYNC_INTERVAL_MS, sinceTs: Date.now() }
      );
      heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_INTERVAL_MS);

      send(`retry: ${RECONNECT_DELAY_MS}\nevent: connected\ndata: {}\n\n`);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
