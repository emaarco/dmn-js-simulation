import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DmnModdle } from 'dmn-moddle'
import { definitionsToDecisionRequirementsDiagramModel, type ModdleElement } from '../../src/adapter/fromModdle'
import { DecisionRequirementsDiagramStore } from '../../src/simulation/DecisionRequirementsDiagramStore'
import { ModelerBridge } from '../../src/simulation/ModelerBridge'
import type { DecisionRequirementsDiagramModel } from '../../src/domain/decisionRequirementsDiagram'

async function discountModel(): Promise<DecisionRequirementsDiagramModel> {
  const xml = readFileSync(resolve(process.cwd(), 'test/fixtures/chaining/discount.dmn'), 'utf-8')
  const { rootElement } = await new DmnModdle().fromXML(xml)
  return definitionsToDecisionRequirementsDiagramModel(rootElement as ModdleElement)
}

function singleDecisionModel(): DecisionRequirementsDiagramModel {
  return {
    inputData: [{ id: 'In', name: 'In', label: 'In', typeRef: 'integer' }],
    decisions: [
      {
        id: 'A',
        name: 'A',
        variableName: 'A',
        requiredDecisionIds: [],
        requiredInputIds: ['In'],
        logic: { kind: 'literalExpression', expression: 'In' },
      },
    ],
  }
}

describe('DecisionRequirementsDiagramStore', () => {
  it('is only simulatable for a graph with more than one decision and some input data', async () => {
    const store = new DecisionRequirementsDiagramStore(null)
    expect(store.isSimulatable()).toBe(false)
    store.setModel(singleDecisionModel())
    expect(store.isSimulatable()).toBe(false)
    store.setModel(await discountModel())
    expect(store.isSimulatable()).toBe(true)
  })

  it('reports every decision that fired on run', async () => {
    const store = new DecisionRequirementsDiagramStore(null)
    store.setModel(await discountModel())
    store.setValue('InputData_Age', '25')
    store.setValue('InputData_Amount', '150')
    store.run()
    expect(store.firedDecisionIds()).toEqual(['Decision_Level', 'Decision_Discount'])
    expect(store.getResult()?.results.Decision_Discount.value).toBe(5)
  })

  it('does not report a decision table without a matching rule as fired', async () => {
    const store = new DecisionRequirementsDiagramStore(null)
    store.setModel(await discountModel())
    store.run()
    expect(store.firedDecisionIds()).not.toContain('Decision_Level')
  })

  it('publishes a run to the bridge and clears it on reset', async () => {
    const bridge = new ModelerBridge()
    const store = new DecisionRequirementsDiagramStore(bridge)
    store.setModel(await discountModel())
    store.setValue('InputData_Age', '40')
    store.setValue('InputData_Amount', '150')
    store.run()
    expect(bridge.getTableReflection('Decision_Discount')?.inputs).toEqual(['senior', 150])

    store.reset()
    expect(bridge.getTableReflection('Decision_Discount')).toBeNull()
    expect(store.getValues()).toEqual({})
    expect(store.firedDecisionIds()).toEqual([])
  })

  it('drops the result and the bridge reflection when the model changes', async () => {
    const bridge = new ModelerBridge()
    const store = new DecisionRequirementsDiagramStore(bridge)
    store.setModel(await discountModel())
    store.run()
    store.setModel(await discountModel())
    expect(store.getResult()).toBeNull()
    expect(bridge.getTableReflection('Decision_Level')).toBeNull()
  })

  it('notifies subscribers on every change', async () => {
    const store = new DecisionRequirementsDiagramStore(null)
    const listener = vi.fn()
    store.subscribe(listener)
    store.setModel(await discountModel())
    store.setValue('InputData_Age', '25')
    store.run()
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
