/**
 * dmn-js decision-table integration: wires the simulation UI and row
 * highlighting into a `table-js` viewer/editor.
 *
 * Responsibilities:
 *  - contribute the `SimulationFormComponent` to the `table.before` slot so the
 *    form appears above the table (idiomatic, re-render-safe insertion);
 *  - build a `DecisionModel` from the live `dmn:DecisionTable` businessObject and
 *    push it into the shared `SimulationStore`;
 *  - subscribe to the store and reflect the evaluation result by toggling CSS
 *    classes on the rule rows in the rendered table.
 *
 * Registered as a `table-js` didi module (see `./index.ts`).
 */

import { decisionTableToModel, type ModdleElement } from '../../adapter/fromModdle'
import type { SimulationStore } from '../../simulation/SimulationStore'
import { getModelerBridge } from '../../simulation/ModelerBridge'
import { SimulationFormComponent } from '../../ui/SimulationForm'

interface EventBus {
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}
interface Sheet {
  getRoot(): { businessObject?: ModdleElement } | null | undefined
}
interface Renderer {
  getContainer(): HTMLElement
}
interface Components {
  onGetComponent(type: string, callback: (context: unknown) => unknown): void
}
interface Injector {
  get<T = unknown>(name: string, strict: false): T | null
}

export class TableSimulation {
  static $inject = ['eventBus', 'sheet', 'renderer', 'components', 'simulationStore', 'injector']

  private readonly sheet: Sheet
  private readonly renderer: Renderer
  private readonly store: SimulationStore

  /** Teardown callbacks run on `diagram.destroy` (event listeners, subscriptions). */
  private readonly disposers: Array<() => void> = []
  private destroyed = false
  private scheduled?: { cancel: () => void }

  constructor(
    eventBus: EventBus,
    sheet: Sheet,
    renderer: Renderer,
    components: Components,
    store: SimulationStore,
    injector: Injector,
  ) {
    this.sheet = sheet
    this.renderer = renderer
    this.store = store

    components.onGetComponent('table.before', () => SimulationFormComponent)

    // Build (or refresh) the model once the table has rendered, and whenever its
    // structure changes. Re-apply the highlight a frame later: a table-js
    // re-render creates fresh <tr> nodes and drops our direct-DOM classes, so the
    // highlight (local run, or a reflected DRD run) must be restored afterwards.
    const onRender = (): void => this.onRender()
    eventBus.on('import.render.complete', onRender)
    eventBus.on('elements.changed', onRender)
    this.disposers.push(() => {
      eventBus.off('import.render.complete', onRender)
      eventBus.off('elements.changed', onRender)
    })

    // Reflect every store change (run / reset / input edit) in the table rows.
    this.disposers.push(this.store.subscribe(() => this.highlight()))
    // The bridge outlives this viewer (one per parent Manager), so we MUST
    // disconnect on destroy or every reimport leaks a listener pinning this viewer.
    const bridge = getModelerBridge(injector.get('_parent', false))
    if (bridge) this.disposers.push(this.store.connectBridge(bridge))

    eventBus.on('diagram.destroy', () => this.destroy())
  }

  private destroy(): void {
    this.destroyed = true
    this.scheduled?.cancel()
    this.scheduled = undefined
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  private onRender(): void {
    this.refreshModel()
    this.scheduleHighlight()
  }

  /**
   * Re-apply the highlight after the DOM has committed the current render.
   * Cancellable and a no-op once destroyed, so a queued frame never runs against
   * a torn-down renderer.
   */
  private scheduleHighlight(): void {
    if (this.destroyed) return
    this.scheduled?.cancel()
    if (typeof requestAnimationFrame === 'function') {
      const id = requestAnimationFrame(() => {
        this.scheduled = undefined
        this.highlight()
      })
      this.scheduled = { cancel: () => cancelAnimationFrame(id) }
    } else {
      const id = setTimeout(() => {
        this.scheduled = undefined
        this.highlight()
      }, 0)
      this.scheduled = { cancel: () => clearTimeout(id) }
    }
  }

  private refreshModel(): void {
    const businessObject = this.sheet.getRoot()?.businessObject
    if (!businessObject || businessObject.$type !== 'dmn:DecisionTable') {
      this.store.setModel(null)
      return
    }

    const next = decisionTableToModel(businessObject)
    if (!this.store.getModel()) this.store.setModel(next)
    else this.store.refreshModel(next)
  }

  private highlight(): void {
    if (this.destroyed) return
    const container = this.renderer.getContainer()
    if (!container) return

    const result = this.store.getResult()
    const reported = new Set(result?.reportedRuleIndices ?? [])
    const matched = new Set(result?.matchedRuleIndices ?? [])

    ruleRows(container).forEach((row, index) => {
      row.classList.toggle('dmn-sim-match', reported.has(index))
      row.classList.toggle('dmn-sim-candidate', matched.has(index) && !reported.has(index))
    })
  }
}

/** The rendered rule rows, in table (and model) order. */
function ruleRows(container: HTMLElement): HTMLElement[] {
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
