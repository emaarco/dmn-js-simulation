/**
 * Draws a DRD run on the canvas: every decision that fired gets a marker and a
 * badge overlay showing its result value.
 */

import type { ModdleElement } from '../../adapter/utils/moddle'
import type { DecisionRequirementsDiagramStore } from '../../simulation/DecisionRequirementsDiagramStore'
import { formatValue } from '../../ui/utils/formatValue'

export interface Canvas {
  getContainer(): HTMLElement
  addMarker(element: string | object, marker: string): void
  removeMarker(element: string | object, marker: string): void
}
export interface DiagramElement {
  id: string
  businessObject?: ModdleElement
}
export interface ElementRegistry {
  get(id: string): DiagramElement | undefined
  filter(fn: (element: DiagramElement) => boolean): DiagramElement[]
}
export interface Overlays {
  add(element: string | object, type: string, overlay: unknown): string
  remove(filter: string | { type?: string }): void
}

const FIRED_MARKER = 'dmn-sim-fired'
const OVERLAY_TYPE = 'dmn-sim-decision-requirements-diagram'

export class DecisionResultOverlays {
  private markedIds: string[] = []

  constructor(
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry,
    private readonly overlays: Overlays,
  ) {}

  show(store: DecisionRequirementsDiagramStore): void {
    this.clear()
    const result = store.getResult()
    if (!result) return
    for (const decisionId of store.firedDecisionIds()) {
      const element = this.findDecisionElement(decisionId)
      if (!element) continue
      this.canvas.addMarker(element, FIRED_MARKER)
      this.markedIds.push(element.id)
      const badge = document.createElement('div')
      badge.className = 'dmn-sim-badge'
      badge.textContent = formatValue(result.results[decisionId].value)
      this.overlays.add(element, OVERLAY_TYPE, { position: { bottom: -6, left: 0 }, html: badge })
    }
  }

  private clear(): void {
    for (const id of this.markedIds) {
      const element = this.elementRegistry.get(id)
      if (element) this.canvas.removeMarker(element, FIRED_MARKER)
    }
    this.markedIds = []
    this.overlays.remove({ type: OVERLAY_TYPE })
  }

  private findDecisionElement(decisionId: string): DiagramElement | undefined {
    return (
      this.elementRegistry.get(decisionId) ?? this.elementRegistry.filter(el => el.businessObject?.id === decisionId)[0]
    )
  }
}
