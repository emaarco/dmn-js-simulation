/**
 * dmn-js DRD (diagram-js) integration: simulate a whole decision requirement
 * graph. Renders an input panel for the DRD's InputData leaves, evaluates the
 * graph on demand, marks the decisions that fired and shows each decision's
 * result as an overlay. The per-decision results are published to the shared
 * `ModelerBridge` so drilling into a decision table reflects the run.
 *
 * Registered as a diagram-js didi module (see `./index.ts`).
 */

import { definitionsToDecisionRequirementsDiagramModel, type ModdleElement } from '../../adapter/fromModdle'
import { DecisionRequirementsDiagramStore } from '../../simulation/DecisionRequirementsDiagramStore'
import { getModelerBridge } from '../../simulation/ModelerBridge'
import { formatValue } from '../../ui/formatValue'
import { describeControl, type ControlInput } from '../../ui/inputControl'
import { composeDuration, DEFAULT_DURATION_UNIT, DURATION_UNITS, type DurationUnit } from '../../ui/duration'

interface EventBus {
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}
interface Canvas {
  getContainer(): HTMLElement
  addMarker(element: string | object, marker: string): void
  removeMarker(element: string | object, marker: string): void
}
interface Element {
  id: string
  businessObject?: ModdleElement
}
interface ElementRegistry {
  get(id: string): Element | undefined
  filter(fn: (element: Element) => boolean): Element[]
}
interface Overlays {
  add(element: string | object, type: string, overlay: unknown): string
  remove(filter: string | { type?: string }): void
}
interface Injector {
  get<T = unknown>(name: string, strict: false): T | null
}

const FIRED_MARKER = 'dmn-sim-fired'
const OVERLAY_TYPE = 'dmn-sim-decision-requirements-diagram'

export class DecisionRequirementsDiagramSimulation {
  static $inject = ['eventBus', 'canvas', 'elementRegistry', 'overlays', 'injector']

  private readonly canvas: Canvas
  private readonly elementRegistry: ElementRegistry
  private readonly overlays: Overlays
  private readonly store: DecisionRequirementsDiagramStore

  private readonly parent: { getDefinitions?: () => ModdleElement } | null
  private markedIds: string[] = []

  private panel?: HTMLElement
  private readonly controlResets: Array<() => void> = []

  constructor(
    eventBus: EventBus,
    canvas: Canvas,
    elementRegistry: ElementRegistry,
    overlays: Overlays,
    injector: Injector,
  ) {
    this.canvas = canvas
    this.elementRegistry = elementRegistry
    this.overlays = overlays
    this.parent = injector.get('_parent', false)
    this.store = new DecisionRequirementsDiagramStore(getModelerBridge(this.parent))
    const unsubscribe = this.store.subscribe(() => this.showResult())

    const onImportDone = (): void => this.refresh()
    eventBus.on('import.done', onImportDone)
    eventBus.on('diagram.destroy', () => {
      eventBus.off('import.done', onImportDone)
      this.store.setModel(null)
      unsubscribe()
      this.panel?.remove()
      this.panel = undefined
      this.controlResets.length = 0
    })
  }

  private refresh(): void {
    const definitions = this.parent?.getDefinitions?.()
    this.store.setModel(definitions ? definitionsToDecisionRequirementsDiagramModel(definitions) : null)
    this.render()
  }

  private render(): void {
    const model = this.store.getModel()
    if (!model || !this.store.isSimulatable()) {
      this.panel?.remove()
      this.panel = undefined
      this.controlResets.length = 0
      return
    }

    if (!this.panel) {
      this.panel = createDiv('dmn-sim-decision-requirements-diagram-panel')
      this.canvas.getContainer().appendChild(this.panel)
    }
    this.panel.innerHTML = ''
    this.controlResets.length = 0

    const title = createDiv('dmn-sim-decision-requirements-diagram-title', 'Simulate DRD')
    this.panel.appendChild(title)

    const fieldsHost = createDiv('dmn-sim-decision-requirements-diagram-fields')
    for (const input of model.inputData) {
      const field = createDiv('dmn-sim-field')
      const label = document.createElement('span')
      label.className = 'dmn-sim-field-label'
      label.textContent = input.label
      const control = this.buildControl(input)
      control.node.addEventListener('input', () => this.store.setValue(input.id, control.read()))
      control.node.addEventListener('change', () => this.store.setValue(input.id, control.read()))
      this.controlResets.push(control.reset)
      field.appendChild(label)
      field.appendChild(control.node)
      fieldsHost.appendChild(field)
    }
    this.panel.appendChild(fieldsHost)

    const actions = createDiv('dmn-sim-decision-requirements-diagram-actions')
    const runButton = document.createElement('button')
    runButton.type = 'button'
    runButton.className = 'dmn-sim-run'
    runButton.textContent = 'Simulate'
    runButton.addEventListener('click', () => this.store.run())
    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'dmn-sim-reset'
    resetButton.textContent = 'Reset'
    resetButton.addEventListener('click', () => this.reset())
    actions.appendChild(runButton)
    actions.appendChild(resetButton)
    this.panel.appendChild(actions)
  }

  /** One field control: a single input, or a duration composer (number + unit). */
  private buildControl(input: ControlInput): { node: HTMLElement; read: () => string; reset: () => void } {
    const spec = describeControl(input)
    if (spec.kind === 'select') {
      const select = document.createElement('select')
      select.className = 'dmn-sim-input'
      for (const option of ['', ...spec.options]) {
        const opt = document.createElement('option')
        opt.value = option
        opt.textContent = option || '–'
        select.appendChild(opt)
      }
      return { node: select, read: () => select.value, reset: () => (select.value = '') }
    }
    if (spec.kind === 'duration') {
      const wrapper = createDiv('dmn-sim-duration')
      const amount = document.createElement('input')
      amount.className = 'dmn-sim-input dmn-sim-duration-amount'
      amount.type = 'number'
      amount.min = '0'
      amount.placeholder = 'amount'
      const unit = document.createElement('select')
      unit.className = 'dmn-sim-input dmn-sim-duration-unit'
      for (const u of DURATION_UNITS) {
        const opt = document.createElement('option')
        opt.value = u.value
        opt.textContent = u.label
        unit.appendChild(opt)
      }
      unit.value = DEFAULT_DURATION_UNIT
      wrapper.appendChild(amount)
      wrapper.appendChild(unit)
      return {
        node: wrapper,
        read: () => composeDuration(amount.value, unit.value as DurationUnit),
        reset: () => {
          amount.value = ''
          unit.value = DEFAULT_DURATION_UNIT
        },
      }
    }
    const control = document.createElement('input')
    control.className = 'dmn-sim-input'
    control.type = spec.htmlType
    control.placeholder = spec.placeholder
    if (spec.min !== undefined) control.min = spec.min
    if (spec.max !== undefined) control.max = spec.max
    return { node: control, read: () => control.value, reset: () => (control.value = '') }
  }

  private reset(): void {
    for (const reset of this.controlResets) reset()
    this.store.reset()
  }

  private showResult(): void {
    this.clearMarkersAndOverlays()
    const result = this.store.getResult()
    if (!result) return
    for (const decisionId of this.store.firedDecisionIds()) {
      const element = this.findDecisionElement(decisionId)
      if (!element) continue
      this.canvas.addMarker(element, FIRED_MARKER)
      this.markedIds.push(element.id)
      this.overlays.add(element, OVERLAY_TYPE, {
        position: { bottom: -6, left: 0 },
        html: `<div class="dmn-sim-badge">${escapeHtml(formatValue(result.results[decisionId].value))}</div>`,
      })
    }
  }

  private clearMarkersAndOverlays(): void {
    for (const id of this.markedIds) {
      const element = this.elementRegistry.get(id)
      if (element) this.canvas.removeMarker(element, FIRED_MARKER)
    }
    this.markedIds = []
    this.overlays.remove({ type: OVERLAY_TYPE })
  }

  private findDecisionElement(decisionId: string): Element | undefined {
    return (
      this.elementRegistry.get(decisionId) ?? this.elementRegistry.filter(el => el.businessObject?.id === decisionId)[0]
    )
  }
}

function createDiv(className: string, text?: string): HTMLElement {
  const div = document.createElement('div')
  div.className = className
  if (text !== undefined) div.textContent = text
  return div
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}
