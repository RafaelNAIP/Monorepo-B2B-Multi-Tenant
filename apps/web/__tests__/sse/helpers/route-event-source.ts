import { GET } from "../../../app/api/threads/[ticketId]/events/route";

type Listener = (event: { data?: string }) => void;

/**
 * EventSource de teste que conversa com o route handler REAL: chama `GET`,
 * lê o ReadableStream da Response e faz o parse dos frames conforme a
 * especificação SSE (campos id/event/data/retry, linhas em branco como
 * delimitador, comentários iniciados por ":"). Se o formato do servidor
 * quebrar, o parse quebra junto.
 */
export class RouteEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = RouteEventSource.CONNECTING;
  private listeners = new Map<string, Set<Listener>>();
  private abort = new AbortController();
  private reader?: ReadableStreamDefaultReader<Uint8Array>;

  /** Quantos comentários de heartbeat foram vistos (e ignorados como evento). */
  comments = 0;

  constructor(public readonly url: string) {
    void this.run();
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  close() {
    this.readyState = RouteEventSource.CLOSED;
    this.abort.abort();
  }

  private dispatch(type: string, event: { data?: string } = {}) {
    if (this.readyState === RouteEventSource.CLOSED) return;
    for (const l of [...(this.listeners.get(type) ?? [])]) l(event);
  }

  private async run() {
    const ticketId = decodeURIComponent(this.url.split("/")[3]);
    const request = new Request(`http://localhost${this.url}`, {
      signal: this.abort.signal,
    });
    const response = await GET(request, { params: Promise.resolve({ ticketId }) });
    this.reader = response.body!.getReader();

    this.readyState = RouteEventSource.OPEN;
    this.dispatch("open");

    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await this.reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        this.handleFrame(frame);
      }
    }
    if (this.readyState !== RouteEventSource.CLOSED) {
      this.readyState = RouteEventSource.CONNECTING;
      this.dispatch("error");
    }
  }

  private handleFrame(frame: string) {
    let event = "message";
    const data: string[] = [];
    let sawField = false;
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) {
        this.comments += 1;
        continue;
      }
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      const value = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
      sawField = true;
    }
    if (!sawField) return; // só comentário
    this.dispatch(event, { data: data.join("\n") });
  }
}
