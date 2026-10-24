import { describe, it, expect, vi } from 'vitest'
import { Observable } from '../../src/simulation/Observable'

class Counter extends Observable {
  increment(): void {
    this.notify()
  }
}

describe('Observable', () => {
  it('notifies every listener that was subscribed when the change happened', () => {
    const counter = new Counter()
    const late = vi.fn()
    counter.subscribe(() => counter.subscribe(late))
    let unsubscribe = (): void => undefined
    counter.subscribe(() => unsubscribe())
    const unsubscribed = vi.fn()
    unsubscribe = counter.subscribe(unsubscribed)

    counter.increment()

    expect(late).not.toHaveBeenCalled()
    expect(unsubscribed).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const counter = new Counter()
    const listener = vi.fn()
    const unsubscribe = counter.subscribe(listener)
    unsubscribe()
    counter.increment()
    expect(listener).not.toHaveBeenCalled()
  })
})
