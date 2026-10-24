import { describe, it, expect } from 'vitest'
import type { DecisionModel } from '../../src/domain/model'
import { DecisionTableEvaluator } from '../../src/domain/DecisionTableEvaluator'

function budgetModel(budgetEntries: string[]): DecisionModel {
  return {
    decisionId: 'd',
    decisionName: 'd',
    hitPolicy: 'COLLECT',
    inputs: [{ id: 'i', label: 'Budget', expression: 'Budget', typeRef: 'integer', options: [] }],
    outputs: [{ id: 'o', name: 'Out', label: 'Out', typeRef: 'string', priorityValues: [] }],
    rules: budgetEntries.map((entry, index) => ({
      id: `r${index}`,
      inputEntries: [entry],
      outputEntries: [`"${index}"`],
    })),
  }
}

describe('DecisionTableEvaluator — empty (null) input', () => {
  it('matches a dash and an empty entry', () => {
    expect(new DecisionTableEvaluator(budgetModel(['-', ''])).evaluate(['']).matchedRuleIndices).toEqual([0, 1])
  })

  it('does not match a concrete test', () => {
    expect(new DecisionTableEvaluator(budgetModel(['>= 1000', '500'])).evaluate(['']).matchedRuleIndices).toEqual([])
  })

  it('matches an explicit null entry but not not(null)', () => {
    expect(new DecisionTableEvaluator(budgetModel(['null', 'not(null)'])).evaluate(['']).matchedRuleIndices).toEqual([
      0,
    ])
  })

  it('matches not(null) but not null once a value is given', () => {
    expect(
      new DecisionTableEvaluator(budgetModel(['null', 'not(null)'])).evaluate(['1500']).matchedRuleIndices,
    ).toEqual([1])
  })

  it('treats null and undefined raw values like an empty field', () => {
    expect(new DecisionTableEvaluator(budgetModel(['null'])).evaluate([null]).matchedRuleIndices).toEqual([0])
    expect(new DecisionTableEvaluator(budgetModel(['null'])).evaluate([undefined]).matchedRuleIndices).toEqual([0])
  })
})
