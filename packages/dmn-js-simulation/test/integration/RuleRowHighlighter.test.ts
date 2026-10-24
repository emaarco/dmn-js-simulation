// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { RuleRowHighlighter } from '../../src/integration/table/RuleRowHighlighter'
import { SimulationStore } from '../../src/simulation/SimulationStore'
import type { DecisionModel } from '../../src/domain/model'

function collectModel(): DecisionModel {
  return {
    decisionId: 'd',
    decisionName: 'Dish',
    hitPolicy: 'FIRST',
    inputs: [{ id: 'i', label: 'Season', expression: 'Season', typeRef: 'string', options: [] }],
    outputs: [{ id: 'o', name: 'Dish', label: 'Dish', typeRef: 'string', priorityValues: [] }],
    rules: [
      { id: 'r1', inputEntries: ['"Fall"'], outputEntries: ['"Spareribs"'] },
      { id: 'r2', inputEntries: ['-'], outputEntries: ['"Stew"'] },
      { id: 'r3', inputEntries: ['"Winter"'], outputEntries: ['"Roastbeef"'] },
    ],
  }
}

function renderedTable(ruleCount: number): HTMLElement {
  const container = document.createElement('div')
  const rows = Array.from({ length: ruleCount }, (_, i) => `<tr><td data-row-id="r${i + 1}">${i + 1}</td></tr>`)
  container.innerHTML = `<table><tbody>${rows.join('')}<tr><td>add rule</td></tr></tbody></table>`
  return container
}

function rowClasses(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('tbody tr')).map(row => row.className)
}

describe('RuleRowHighlighter', () => {
  it('marks reported rules as match and other matched rules as candidate', () => {
    const container = renderedTable(3)
    const store = new SimulationStore()
    store.setModel(collectModel())
    new RuleRowHighlighter({ getContainer: () => container }, store)

    store.setValue(0, 'Fall')
    store.run()

    expect(rowClasses(container)).toEqual(['dmn-sim-match', 'dmn-sim-candidate', '', ''])
  })

  it('clears the highlight when the result is invalidated', () => {
    const container = renderedTable(3)
    const store = new SimulationStore()
    store.setModel(collectModel())
    new RuleRowHighlighter({ getContainer: () => container }, store)

    store.run()
    store.setValue(0, 'Winter')

    expect(rowClasses(container)).toEqual(['', '', '', ''])
  })

  it('stops following the store once disposed', () => {
    const container = renderedTable(3)
    const store = new SimulationStore()
    store.setModel(collectModel())
    const highlighter = new RuleRowHighlighter({ getContainer: () => container }, store)

    highlighter.dispose()
    store.run()

    expect(rowClasses(container)).toEqual(['', '', '', ''])
  })
})
