import DmnModeler from 'dmn-js/lib/Modeler'

import 'dmn-js/dist/assets/diagram-js.css'
import 'dmn-js/dist/assets/dmn-js-shared.css'
import 'dmn-js/dist/assets/dmn-js-drd.css'
import 'dmn-js/dist/assets/dmn-js-decision-table.css'
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css'
import 'dmn-js/dist/assets/dmn-js-literal-expression.css'
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css'

import DmnSimulationModule from '@emaarco/dmn-js-simulation'
import '@emaarco/dmn-js-simulation/assets/dmn-js-simulation.css'

interface View {
  type: string
  element: { id: string }
}

interface Viewer {
  get(name: string): unknown
  on(event: string, callback: () => void): void
}

export class Editor {
  readonly modeler = new DmnModeler({
    container: '#canvas',
    decisionTable: { additionalModules: [DmnSimulationModule.decisionTable] },
    drd: { additionalModules: [DmnSimulationModule.decisionRequirementsDiagram] },
  })

  /** Serialize the current model as formatted DMN XML. */
  async saveXml(): Promise<string> {
    const modeler = this.modeler as unknown as { saveXML(o: { format: boolean }): Promise<{ xml: string }> }
    const { xml } = await modeler.saveXML({ format: true })
    return xml
  }

  /** Import DMN XML and open the DRD view by default (the table is a drill-in). */
  async importAndOpen(xml: string): Promise<void> {
    await this.modeler.importXML(xml)
    const views = this.views()
    const drd = views.find(v => v.type === 'drd')
    const table = views.find(v => v.type === 'decisionTable')
    if (drd) await this.modeler.open(drd as never)
    else if (table) await this.modeler.open(table as never)
  }

  /** Open a decision-table view by decision id (used by the drill-in E2E). */
  openDecisionTable(decisionId: string): void {
    const view = this.views().find(v => v.type === 'decisionTable' && v.element.id === decisionId)
    if (view) void this.modeler.open(view as never)
  }

  /**
   * Reflect the active view type on the canvas so CSS can pad the decision table
   * while the DRD stays full-bleed, and keep the DRD centered. `views.changed`
   * fires for every switch — including dmn-js's own "View DRD" button and
   * drill-down — so it never goes stale.
   */
  trackActiveView(canvas: HTMLElement): void {
    this.modeler.on('views.changed', (event: { activeView?: View }) => {
      canvas.dataset.view = event.activeView?.type ?? ''
      if (event.activeView?.type === 'drd') this.centerActiveDiagram()
    })
  }

  /** Call `listener` after every edit, in whichever view it happens. */
  onModelEdited(listener: () => void): void {
    // Each view has its own command stack, so subscribe once per viewer.
    const listenedViewers = new WeakSet<Viewer>()
    this.modeler.on('views.changed', () => {
      const viewer = this.activeViewer()
      if (viewer && !listenedViewers.has(viewer)) {
        listenedViewers.add(viewer)
        viewer.on('commandStack.changed', listener)
      }
    })
  }

  private views(): View[] {
    return this.modeler.getViews() as View[]
  }

  private activeViewer(): Viewer | undefined {
    return (this.modeler as unknown as { getActiveViewer?(): Viewer | undefined }).getActiveViewer?.()
  }

  /**
   * Center the active DRD diagram in the viewport. dmn-js renders it at its DMNDI
   * coordinates (top-left); we fit it to the viewport but never zoom a small
   * diagram past 100 % — so it sits centered at a natural size.
   */
  private centerActiveDiagram(): void {
    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0)
    raf(() => {
      const canvas = this.activeViewer()?.get('canvas') as
        { zoom(scale?: string | number, center?: string): number } | undefined
      if (!canvas) return
      canvas.zoom('fit-viewport', 'auto')
      if (canvas.zoom() > 1) canvas.zoom(1)
    })
  }
}
