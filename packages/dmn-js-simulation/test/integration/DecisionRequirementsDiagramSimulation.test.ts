// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DmnModdle } from 'dmn-moddle'
import { DecisionRequirementsDiagramSimulation } from '../../src/integration/decisionRequirementsDiagram/DecisionRequirementsDiagramSimulation'
import { ModelerBridge } from '../../src/simulation/ModelerBridge'
import type { ModdleElement } from '../../src/adapter/utils/moddle'

function fakeEventBus() {
  const handlers = new Map<string, Set<() => void>>()
  return {
    on: (event: string, cb: () => void) => handlers.set(event, (handlers.get(event) ?? new Set()).add(cb)),
    off: (event: string, cb: () => void) => handlers.get(event)?.delete(cb),
    fire: (event: string) => [...(handlers.get(event) ?? [])].forEach(cb => cb()),
  }
}

async function mount(fixture = 'chaining/discount.dmn') {
  const xml = readFileSync(resolve(process.cwd(), 'test/fixtures', fixture), 'utf-8')
  const { rootElement } = await new DmnModdle().fromXML(xml)
  const parent = { getDefinitions: () => rootElement as ModdleElement }
  const container = document.body.appendChild(document.createElement('div'))
  const markers = new Set<string>()
  const overlays: string[] = []
  const canvas = {
    getContainer: () => container,
    addMarker: (el: { id: string }) => markers.add(el.id),
    removeMarker: (el: { id: string }) => markers.delete(el.id),
  }
  const elementRegistry = { get: (id: string) => ({ id }), filter: () => [] }
  const overlayService = {
    add: (el: { id: string }) => overlays.push(el.id),
    remove: () => overlays.splice(0),
  }
  const injector = { get: () => parent }
  const eventBus = fakeEventBus()
  new DecisionRequirementsDiagramSimulation(
    eventBus as never,
    canvas as never,
    elementRegistry as never,
    overlayService as never,
    injector as never,
  )
  eventBus.fire('import.done')
  return { container, markers, overlays, eventBus, bridge: ModelerBridge.forParent(parent)! }
}

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('DecisionRequirementsDiagramSimulation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('marks fired decisions after a run and clears them on reset', async () => {
    const { container, markers, overlays, bridge } = await mount()
    const [age, amount] = Array.from(container.querySelectorAll<HTMLInputElement>('input.dmn-sim-input'))
    type(age, '25')
    type(amount, '150')
    container.querySelector<HTMLButtonElement>('.dmn-sim-run')!.click()

    expect([...markers]).toEqual(['Decision_Level', 'Decision_Discount'])
    expect(overlays).toHaveLength(2)
    expect(bridge.getTableReflection('Decision_Discount')).not.toBeNull()

    container.querySelector<HTMLButtonElement>('.dmn-sim-reset')!.click()
    expect(markers.size).toBe(0)
    expect(age.value).toBe('')
    expect(bridge.getTableReflection('Decision_Discount')).toBeNull()
  })

  it('removes the panel on destroy', async () => {
    const { container, eventBus } = await mount()
    expect(container.querySelector('.dmn-sim-decision-requirements-diagram-panel')).not.toBeNull()
    eventBus.fire('diagram.destroy')
    expect(container.querySelector('.dmn-sim-decision-requirements-diagram-panel')).toBeNull()
  })

  it('shows no panel for a diagram with a single decision', async () => {
    const { container } = await mount('example.dmn')
    expect(container.querySelector('.dmn-sim-decision-requirements-diagram-panel')).toBeNull()
  })
})
