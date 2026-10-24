/** The structural slice of the dmn-js / diagram-js / table-js services the integration modules use. */

export interface EventBus {
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}

export interface Injector {
  get<T = unknown>(name: string, strict: false): T | null
}
