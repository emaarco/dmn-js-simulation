/**
 * Reflects the current evaluation result in the rendered table by toggling CSS
 * classes on the rule rows: reported rules get `dmn-sim-match`, rules that
 * matched but were not reported get `dmn-sim-candidate`. Follows every store
 * change until disposed.
 */

import type { SimulationStore } from '../../simulation/SimulationStore'

export interface Renderer {
  getContainer(): HTMLElement
}

export class RuleRowHighlighter {
  private scheduled?: { cancel: () => void }
  private disposed = false
  private readonly unsubscribe: () => void

  constructor(
    private readonly renderer: Renderer,
    private readonly store: SimulationStore,
  ) {
    this.unsubscribe = store.subscribe(() => this.apply())
  }

  /**
   * Re-apply after the DOM has committed the current render: a table-js
   * re-render creates fresh <tr> nodes and drops our direct-DOM classes.
   * Cancellable and a no-op once disposed, so a queued frame never runs against
   * a torn-down renderer.
   */
  applyAfterRender(): void {
    if (this.disposed) return
    this.scheduled?.cancel()
    const apply = (): void => {
      this.scheduled = undefined
      this.apply()
    }
    const id = requestAnimationFrame(apply)
    this.scheduled = { cancel: () => cancelAnimationFrame(id) }
  }

  dispose(): void {
    this.disposed = true
    this.unsubscribe()
    this.scheduled?.cancel()
    this.scheduled = undefined
  }

  private apply(): void {
    if (this.disposed) return
    const container = this.renderer.getContainer()
    if (!container) return

    const result = this.store.getResult()
    const reported = new Set(result?.reportedRuleIndices ?? [])
    const matched = new Set(result?.matchedRuleIndices ?? [])

    this.ruleRows(container).forEach((row, index) => {
      row.classList.toggle('dmn-sim-match', reported.has(index))
      row.classList.toggle('dmn-sim-candidate', matched.has(index) && !reported.has(index))
    })
  }

  /** The rendered rule rows, in table (and model) order. */
  private ruleRows(container: HTMLElement): HTMLElement[] {
    // Every rule cell carries `data-row-id`; the "add rule" row (editor) does not,
    // so keying off it selects exactly the real rule rows, in document order.
    const rows: HTMLElement[] = []
    const seen = new Set<HTMLElement>()
    container.querySelectorAll('[data-row-id]').forEach(cell => {
      const row = (cell as HTMLElement).closest('tr') as HTMLElement | null
      if (row && !seen.has(row)) {
        seen.add(row)
        rows.push(row)
      }
    })
    if (rows.length) return rows
    // Fallback if the index column is absent: every body row is a rule row.
    return Array.from(container.querySelectorAll('tbody tr')) as HTMLElement[]
  }
}
