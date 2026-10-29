import {
  threadEventEmitter,
  type ThreadEvent,
} from "@/lib/sse/thread-event-emitter";
import { HEARTBEAT_INTERVAL_MS, RECONNECT_DELAY_MS } from "@/lib/sse/constants";

// SSE precisa do runtime Node (stream de longa duração) e nunca pode ser cacheado.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function formatEvent(event: ThreadEvent): string {
  return `id: ${event.timestamp}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Canal de notificação da thread. Não carrega dados da mensagem: apenas avisa
 * que algo mudou, e o cliente busca o estado atualizado via Server Action.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
): Promise<Response> {
  const { ticketId } = await params;

  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let unsubscribe: (() => void) | undefined;

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

      unsubscribe = threadEventEmitter.subscribe(ticketId, (event) =>
        send(formatEvent(event))
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
