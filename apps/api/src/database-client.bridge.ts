import type { DatabaseClientLifecycle } from "@fas/database";

/** Nest-injectable bridge so controllers avoid parameter `@Inject` tokens. */
export class DatabaseClientBridge implements DatabaseClientLifecycle {
  readonly #inner: DatabaseClientLifecycle;

  constructor(inner: DatabaseClientLifecycle) {
    this.#inner = inner;
  }

  connect(): Promise<void> {
    return this.#inner.connect();
  }

  disconnect(): Promise<void> {
    return this.#inner.disconnect();
  }

  ping(): Promise<void> {
    return this.#inner.ping();
  }
}
