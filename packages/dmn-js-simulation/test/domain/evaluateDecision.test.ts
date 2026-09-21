import { describe, it, expect } from 'vitest'
import type { DecisionModel } from '../../src/domain/model'
import { evaluateDecision } from '../../src/domain/evaluateDecision'

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

describe('evaluateDecision — empty (null) input', () => {
  it('matches a dash and an empty entry', () => {
    expect(evaluateDecision(budgetModel(['-', '']), ['']).matchedRuleIndices).toEqual([0, 1])
  })

  it('does not match a concrete test', () => {
    expect(evaluateDecision(budgetModel(['>= 1000', '500']), ['']).matchedRuleIndices).toEqual([])
  })

  it('matches an explicit null entry but not not(null)', () => {
    expect(evaluateDecision(budgetModel(['null', 'not(null)']), ['']).matchedRuleIndices).toEqual([0])
  })

  it('matches not(null) but not null once a value is given', () => {
    expect(evaluateDecision(budgetModel(['null', 'not(null)']), ['1500']).matchedRuleIndices).toEqual([1])
  })

  it('treats null and undefined raw values like an empty field', () => {
    expect(evaluateDecision(budgetModel(['null']), [null]).matchedRuleIndices).toEqual([0])
    expect(evaluateDecision(budgetModel(['null']), [undefined]).matchedRuleIndices).toEqual([0])
  })
})
