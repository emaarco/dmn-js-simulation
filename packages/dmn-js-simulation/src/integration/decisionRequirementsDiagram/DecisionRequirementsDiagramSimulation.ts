/**
 * dmn-js DRD (diagram-js) integration: simulate a whole decision requirement
 * graph. Mounts the input panel for the DRD's InputData leaves and lets
 * `DecisionResultOverlays` mark the decisions that fired. The per-decision
 * results are published to the shared `ModelerBridge` so drilling into a
 * decision table reflects the run.
 *
 * Registered as a diagram-js didi module (see `./index.ts`).
 */

import { createElement } from 'inferno-create-element'
import { render } from 'inferno'
import { DmnModdleReader } from '../../adapter/DmnModdleReader'
import type { ModdleElement } from '../../adapter/utils/moddle'
import { DecisionRequirementsDiagramStore } from '../../simulation/DecisionRequirementsDiagramStore'
import { ModelerBridge } from '../../simulation/ModelerBridge'
import { DecisionRequirementsDiagramPanel } from '../../ui/DecisionRequirementsDiagramPanel'
import type { EventBus, Injector } from '../dmnJsServices'
import { DecisionResultOverlays, type Canvas, type ElementRegistry, type Overlays } from './DecisionResultOverlays'

interface DmnJsParent {
  getDefinitions?: () => ModdleElement
}

export class DecisionRequirementsDiagramSimulation {
  static $inject = ['eventBus', 'canvas', 'elementRegistry', 'overlays', 'injector']

  private readonly reader = new DmnModdleReader()
  private readonly store: DecisionRequirementsDiagramStore
  private readonly parent: DmnJsParent | null
  private panelHost?: HTMLElement

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    elementRegistry: ElementRegistry,
    overlays: Overlays,
    injector: Injector,
  ) {
    this.parent = injector.get('_parent', false)
    this.store = new DecisionRequirementsDiagramStore(ModelerBridge.forParent(this.parent))
    const resultOverlays = new DecisionResultOverlays(canvas, elementRegistry, overlays)
    const unsubscribe = this.store.subscribe(() => resultOverlays.show(this.store))

    const onImportDone = (): void => this.refresh()
    eventBus.on('import.done', onImportDone)
    eventBus.on('diagram.destroy', () => {
      eventBus.off('import.done', onImportDone)
      this.store.setModel(null)
      unsubscribe()
      this.unmountPanel()
    })
  }

  private refresh(): void {
    const definitions = this.parent?.getDefinitions?.()
    this.store.setModel(definitions ? this.reader.readDecisionRequirementsDiagram(definitions) : null)
    if (this.store.isSimulatable()) this.mountPanel()
    else this.unmountPanel()
  }

  private mountPanel(): void {
    if (this.panelHost) return
    this.panelHost = document.createElement('div')
    this.canvas.getContainer().appendChild(this.panelHost)
    render(createElement(DecisionRequirementsDiagramPanel, { store: this.store }), this.panelHost)
  }

  private unmountPanel(): void {
    if (!this.panelHost) return
    render(null, this.panelHost)
    this.panelHost.remove()
    this.panelHost = undefined
  }
}
