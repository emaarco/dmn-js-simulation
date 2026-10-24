/** The slice of the untyped dmn-js Modeler API the example uses. */
declare module 'dmn-js/lib/Modeler' {
  export interface View {
    type: string
    element: { id: string }
  }

  export interface Viewer {
    get(name: string): unknown
    on(event: string, callback: () => void): void
  }

  export default class DmnModeler {
    constructor(options: Record<string, unknown>)
    importXML(xml: string): Promise<unknown>
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>
    getViews(): View[]
    open(view: View): Promise<unknown>
    getActiveViewer(): Viewer | undefined
    on<TEvent = unknown>(event: string, callback: (event: TEvent) => void): void
  }
}
