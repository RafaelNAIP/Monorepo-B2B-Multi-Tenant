type Listener = (event: { data?: string }) => void;

/**
 * Substituto do EventSource do navegador (o Node/JSDOM não têm um).
 * Reproduz o contrato que importa: addEventListener, readyState, close()
 * e, como o original, uma instância fechada nunca mais dispara eventos.
 * Os métodos `open/fail/emit` são os "controles remotos" do teste.
 */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static reset() {
    FakeEventSource.instances = [];
  }
  static get last(): FakeEventSource {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = FakeEventSource.CONNECTING;
  private listeners = new Map<string, Set<Listener>>();

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  get closed() {
    return this.readyState === FakeEventSource.CLOSED;
  }

  private dispatch(type: string, event: { data?: string } = {}) {
    if (this.closed) return;
    for (const l of [...(this.listeners.get(type) ?? [])]) l(event);
  }

  // ── controles do teste ──
  open() {
    this.readyState = FakeEventSource.OPEN;
    this.dispatch("open");
  }

  /** `permanent`: o navegador desistiu (HTTP 500, content-type errado...). Caso contrário ele tenta reconectar sozinho. */
  fail(permanent = false) {
    this.readyState = permanent
      ? FakeEventSource.CLOSED
      : FakeEventSource.CONNECTING;
    if (permanent) {
      // O navegador dispara `error` e já marca CLOSED; precisamos entregar o evento.
      const l = [...(this.listeners.get("error") ?? [])];
      for (const fn of l) fn({});
    } else {
      this.dispatch("error");
    }
  }

  emit(type: string, payload: Record<string, unknown> = {}) {
    this.dispatch(type, { data: JSON.stringify({ type, ...payload }) });
  }
}
