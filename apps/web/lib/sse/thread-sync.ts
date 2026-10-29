import {
  FALLBACK_POLL_INTERVAL_MS,
  MAX_SSE_ERRORS,
  SSE_REOPEN_DELAY_MS,
  threadEventsUrl,
} from "./constants";
import { THREAD_EVENT_TYPES } from "./thread-event-emitter";

export type SyncMode = "sse" | "polling";

export interface ThreadSyncOptions<TSnapshot> {
  ticketId: string;
  /** Busca o estado atual da thread (ex.: Server Action `pollThreadMessages`). */
  fetchSnapshot: () => Promise<TSnapshot>;
  onSnapshot: (snapshot: TSnapshot) => void;
  createEventSource?: (url: string) => EventSource;
}

export interface ThreadSync {
  start(): void;
  stop(): void;
  getMode(): SyncMode;
}

/**
 * Mantém uma thread sincronizada: o SSE avisa que algo mudou e o estado é
 * buscado via `fetchSnapshot`. Se o SSE ficar indisponível, cai para polling
 * e volta ao SSE assim que a conexão reabrir.
 *
 * Sem dependência de React para ser testável em isolamento.
 */
export function createThreadSync<TSnapshot>(
  options: ThreadSyncOptions<TSnapshot>
): ThreadSync {
  const {
    ticketId,
    fetchSnapshot,
    onSnapshot,
    createEventSource = (url: string) => new EventSource(url),
  } = options;

  let started = false;
  let stopped = false;
  let mode: SyncMode = "sse";
  let consecutiveErrors = 0;
  let source: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reopenTimer: ReturnType<typeof setTimeout> | null = null;

  // ── busca de estado ────────────────────────────────────────────
  // Uma busca por vez. Eventos que chegam durante uma busca em andamento
  // pedem exatamente uma busca de acompanhamento, de modo que o último
  // estado entregue sempre reflete o último evento recebido.
  let inFlight = false;
  let dirty = false;

  async function refresh(): Promise<void> {
    if (stopped) return;
    if (inFlight) {
      dirty = true;
      return;
    }
    inFlight = true;
    try {
      do {
        dirty = false;
        try {
          const snapshot = await fetchSnapshot();
          if (!stopped) onSnapshot(snapshot);
        } catch {
          // Falha de rede: o próximo evento ou tick de polling tenta de novo.
        }
      } while (dirty && !stopped);
    } finally {
      inFlight = false;
    }
  }

  // ── modo polling ───────────────────────────────────────────────
  function enterPolling() {
    if (mode === "polling") return;
    mode = "polling";
    pollTimer = setInterval(() => void refresh(), FALLBACK_POLL_INTERVAL_MS);
  }

  function leavePolling() {
    if (mode !== "polling") return;
    mode = "sse";
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  // ── conexão SSE ────────────────────────────────────────────────
  function connect() {
    const es = createEventSource(threadEventsUrl(ticketId));
    source = es;

    es.addEventListener("open", () => {
      consecutiveErrors = 0;
      leavePolling();
      // Recupera o que possa ter acontecido enquanto estava desconectado.
      void refresh();
    });

    es.addEventListener("error", () => {
      consecutiveErrors += 1;
      if (consecutiveErrors >= MAX_SSE_ERRORS) enterPolling();

      // CLOSED: o navegador desistiu e não vai reconectar sozinho.
      if (es.readyState === 2 /* CLOSED */ && !stopped) {
        es.close();
        reopenTimer = setTimeout(() => {
          reopenTimer = null;
          if (!stopped) connect();
        }, SSE_REOPEN_DELAY_MS);
      }
    });

    for (const type of THREAD_EVENT_TYPES) {
      es.addEventListener(type, () => void refresh());
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      connect();
    },

    stop() {
      stopped = true;
      source?.close();
      source = null;
      if (pollTimer) clearInterval(pollTimer);
      if (reopenTimer) clearTimeout(reopenTimer);
      pollTimer = null;
      reopenTimer = null;
    },

    getMode: () => mode,
  };
}
