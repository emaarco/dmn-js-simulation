import { describe, it, expect } from 'vitest'
import { DecisionModelBuilder, type RawDecisionTable } from '../../src/adapter/DecisionModelBuilder'

function raw(overrides: Partial<RawDecisionTable> = {}): RawDecisionTable {
  return {
    decisionId: 'd',
    decisionName: 'Dish',
    hitPolicy: '',
    aggregation: '',
    inputs: [{ id: '', label: '', expression: '', typeRef: '' }],
    outputs: [{ id: '', name: '', label: '', typeRef: '', outputValues: '' }],
    rules: [{ id: '', inputEntries: ['"Fall"'], outputEntries: ['1'] }],
    ...overrides,
  }
}

describe('DecisionModelBuilder', () => {
  it('fills every missing value with its fallback', () => {
    const model = new DecisionModelBuilder().build(raw())
    expect(model.hitPolicy).toBe('UNIQUE')
    expect(model.aggregation).toBeUndefined()
    expect(model.inputs[0]).toMatchObject({ id: 'input_0', label: 'Input 1', typeRef: 'string' })
    expect(model.outputs[0]).toMatchObject({ id: 'output_0', name: 'Output 1', label: 'Output 1', typeRef: 'string' })
    expect(model.rules[0].id).toBe('rule_0')
  })

  it('labels an input by its expression and names an output by its label', () => {
    const model = new DecisionModelBuilder().build(
      raw({
        inputs: [{ id: 'i', label: '', expression: 'Season', typeRef: 'string' }],
        outputs: [{ id: 'o', name: '', label: 'Dish', typeRef: 'string', outputValues: '' }],
      }),
    )
    expect(model.inputs[0].label).toBe('Season')
    expect(model.outputs[0].name).toBe('Dish')
  })

  it('normalises the hit policy and accepts only known aggregations', () => {
    expect(new DecisionModelBuilder().build(raw({ hitPolicy: 'collect', aggregation: 'sum' }))).toMatchObject({
      hitPolicy: 'COLLECT',
      aggregation: 'SUM',
    })
    expect(new DecisionModelBuilder().build(raw({ aggregation: 'AVG' })).aggregation).toBeUndefined()
  })

  it('derives options, bounds and priority values from the rules', () => {
    const model = new DecisionModelBuilder().build(
      raw({
        inputs: [
          { id: 'season', label: 'Season', expression: 'Season', typeRef: 'string' },
          { id: 'guests', label: 'Guests', expression: 'Guests', typeRef: 'integer' },
        ],
        outputs: [{ id: 'o', name: 'Dish', label: '', typeRef: '', outputValues: '"high","low"' }],
        rules: [
          { id: 'r1', inputEntries: ['"Fall"', '[1..4]'], outputEntries: ['"high"'] },
          { id: 'r2', inputEntries: ['"Winter"', '[5..8]'], outputEntries: ['"low"'] },
        ],
      }),
    )
    expect(model.inputs[0].options).toEqual(['Fall', 'Winter'])
    expect(model.inputs[1]).toMatchObject({ min: '1', max: '8' })
    expect(model.outputs[0].priorityValues).toEqual(['high', 'low'])
  })
})
