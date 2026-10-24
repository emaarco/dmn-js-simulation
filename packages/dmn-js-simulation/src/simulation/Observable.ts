export type Listener = () => void

export class Observable {
  private readonly listeners = new Set<Listener>()

  /** Returns the matching unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  protected notify(): void {
    // Snapshot: a listener may (un)subscribe during notification.
    for (const listener of [...this.listeners]) listener()
  }
}
