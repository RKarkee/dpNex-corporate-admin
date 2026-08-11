/**
 * A tiny axios-style interceptor registry.
 *
 * Handlers run in registration order and each one receives the previous one's
 * output, so ordering is the contract: register the corporate-code injector
 * before anything that reads headers.
 *
 * `use()` returns an id; pass it to `eject()` to remove the handler. That
 * matters in dev, where Fast Refresh re-runs module bodies and would otherwise
 * stack duplicates.
 */
export class InterceptorManager<Handler> {
  #handlers = new Map<number, Handler>();
  #nextId = 0;

  use(handler: Handler): number {
    const id = this.#nextId++;
    this.#handlers.set(id, handler);
    return id;
  }

  eject(id: number): void {
    this.#handlers.delete(id);
  }

  clear(): void {
    this.#handlers.clear();
  }

  get size(): number {
    return this.#handlers.size;
  }

  /** Snapshot, so a handler that registers another one does not affect this pass. */
  list(): Handler[] {
    return [...this.#handlers.values()];
  }
}
