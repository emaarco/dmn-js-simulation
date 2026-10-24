/**
 * dmn-js decision-table integration: wires the simulation UI and row
 * highlighting into a `table-js` viewer/editor.
 *
 *  - contributes the `SimulationForm` to the `table.before` slot so the form
 *    appears above the table (idiomatic, re-render-safe insertion);
 *  - builds a `DecisionModel` from the live `dmn:DecisionTable` businessObject
 *    and pushes it into the `SimulationStore`;
 *  - lets a `RuleRowHighlighter` reflect the result on the rule rows.
 *
 * Registered as a `table-js` didi module (see `./index.ts`).
 */

import { DmnModdleReader } from '../../adapter/DmnModdleReader'
import type { ModdleElement } from '../../adapter/utils/moddle'
import type { SimulationStore } from '../../simulation/SimulationStore'
import { ModelerBridge } from '../../simulation/ModelerBridge'
import { SimulationForm } from '../../ui/SimulationForm'
import type { EventBus, Injector } from '../dmnJsServices'
import { RuleRowHighlighter, type Renderer } from './RuleRowHighlighter'

interface Sheet {
  getRoot(): { businessObject?: ModdleElement } | null | undefined
}
interface Components {
  onGetComponent(type: string, callback: (context: unknown) => unknown): void
}

export class TableSimulation {
  static $inject = ['eventBus', 'sheet', 'renderer', 'components', 'simulationStore', 'injector']

  private readonly reader = new DmnModdleReader()
  private readonly highlighter: RuleRowHighlighter
  /** Teardown callbacks run on `diagram.destroy` (event listeners, subscriptions). */
  private readonly disposers: Array<() => void> = []

  constructor(
    eventBus: EventBus,
    private readonly sheet: Sheet,
    renderer: Renderer,
    components: Components,
    private readonly store: SimulationStore,
    injector: Injector,
  ) {
    components.onGetComponent('table.before', () => SimulationForm)

    this.highlighter = new RuleRowHighlighter(renderer, store)
    this.disposers.push(() => this.highlighter.dispose())

    // Build (or refresh) the model once the table has rendered, and whenever its
    // structure changes; a re-render drops the row highlight, so restore it.
    const onRender = (): void => {
      this.refreshModel()
      this.highlighter.applyAfterRender()
    }
    eventBus.on('import.render.complete', onRender)
    eventBus.on('elements.changed', onRender)
    this.disposers.push(() => {
      eventBus.off('import.render.complete', onRender)
      eventBus.off('elements.changed', onRender)
    })

    // The bridge outlives this viewer (one per parent Manager), so we MUST
    // disconnect on destroy or every reimport leaks a listener pinning this viewer.
    const bridge = ModelerBridge.forParent(injector.get('_parent', false))
    if (bridge) this.disposers.push(this.store.connectBridge(bridge))

    eventBus.on('diagram.destroy', () => this.destroy())
  }

  private destroy(): void {
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  private refreshModel(): void {
    const businessObject = this.sheet.getRoot()?.businessObject
    const isDecisionTable = businessObject?.$type === 'dmn:DecisionTable'
    this.store.setModel(isDecisionTable ? this.reader.readDecisionTable(businessObject) : null)
  }
}
