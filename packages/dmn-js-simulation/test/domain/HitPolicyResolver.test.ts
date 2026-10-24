import { describe, it, expect } from 'vitest'
import type { Aggregation, DecisionModel, HitPolicy } from '../../src/domain/model'
import { HitPolicyResolver } from '../../src/domain/HitPolicyResolver'
import type { RuleOutput } from '../../src/domain/results'

/**
 * Pure hit-policy tests: `HitPolicyResolver` takes already-evaluated outputs, so no
 * FEEL is involved. Models carry only what the policy reads (hitPolicy,
 * aggregation, outputs); rules/inputs are irrelevant here.
 */
function makeModel(
  hitPolicy: HitPolicy,
  opts: { priorityValues?: string[]; aggregation?: Aggregation; outputType?: string } = {},
): DecisionModel {
  return {
    decisionId: 'd',
    decisionName: 'd',
    hitPolicy,
    aggregation: opts.aggregation,
    inputs: [],
    rules: [],
    outputs: [
      {
        id: 'o',
        name: 'Out',
        label: 'Out',
        typeRef: opts.outputType ?? 'string',
        priorityValues: opts.priorityValues ?? [],
      },
    ],
  }
}

/** Build the `outputsByRule` map from a list keyed by rule index. */
function outputs(...vals: unknown[]): Record<number, RuleOutput> {
  return Object.fromEntries(vals.map((v, i) => [i, { Out: v }]))
}

describe('FIRST', () => {
  it('reports the first matching rule', () => {
    const r = new HitPolicyResolver(makeModel('FIRST')).resolve([0, 1], outputs('A', 'B'))
    expect(r.reportedRuleIndices).toEqual([0])
    expect(r.outputs).toEqual([{ Out: 'A' }])
    expect(r.violation).toBeUndefined()
  })
})

describe('UNIQUE', () => {
  it('reports a single clean match', () => {
    const r = new HitPolicyResolver(makeModel('UNIQUE')).resolve([1], outputs(undefined, 'B'))
    expect(r.reportedRuleIndices).toEqual([1])
    expect(r.violation).toBeUndefined()
  })

  it('flags a violation when more than one rule matches', () => {
    const r = new HitPolicyResolver(makeModel('UNIQUE')).resolve([0, 1], outputs('A', 'B'))
    expect(r.violation).toMatch(/UNIQUE hit policy violated/)
    expect(r.reportedRuleIndices).toEqual([0])
  })
})

describe('ANY', () => {
  it('highlights every matching rule but returns a single output', () => {
    const r = new HitPolicyResolver(makeModel('ANY')).resolve([0, 1], outputs('OK', 'OK'))
    expect(r.reportedRuleIndices).toEqual([0, 1]) // all agreeing rules count
    expect(r.outputs).toEqual([{ Out: 'OK' }]) // ...but ANY yields one value
    expect(r.violation).toBeUndefined()
  })

  it('flags a violation when matching rules disagree', () => {
    const r = new HitPolicyResolver(makeModel('ANY')).resolve([0, 1], outputs('OK', 'NO'))
    expect(r.violation).toMatch(/ANY hit policy violated/)
  })
})

describe('PRIORITY', () => {
  it('picks the highest-priority output among matches', () => {
    const model = makeModel('PRIORITY', { priorityValues: ['High', 'Medium', 'Low'] })
    const r = new HitPolicyResolver(model).resolve([0, 1], outputs('Low', 'High'))
    expect(r.reportedRuleIndices).toEqual([1])
    expect(r.outputs).toEqual([{ Out: 'High' }])
  })
})

describe('OUTPUT ORDER', () => {
  it('lists all matches sorted by output priority', () => {
    const model = makeModel('OUTPUT ORDER', { priorityValues: ['High', 'Medium', 'Low'] })
    const r = new HitPolicyResolver(model).resolve([0, 1], outputs('Low', 'High'))
    expect(r.reportedRuleIndices).toEqual([1, 0])
    expect(r.outputs).toEqual([{ Out: 'High' }, { Out: 'Low' }])
  })
})

describe('PRIORITY / OUTPUT ORDER without output values', () => {
  it('flags a violation when >1 rule matches and no output ordering is defined', () => {
    const priority = new HitPolicyResolver(makeModel('PRIORITY')).resolve([0, 1], outputs('A', 'B'))
    const outputOrder = new HitPolicyResolver(makeModel('OUTPUT ORDER')).resolve([0, 1], outputs('A', 'B'))
    expect(priority.violation).toMatch(/PRIORITY hit policy: no output values/)
    expect(outputOrder.violation).toMatch(/OUTPUT ORDER hit policy: no output values/)
    // Falls back to table order rather than throwing.
    expect(priority.reportedRuleIndices).toEqual([0])
    expect(outputOrder.reportedRuleIndices).toEqual([0, 1])
  })

  it('does not flag a single match (ordering is irrelevant)', () => {
    expect(new HitPolicyResolver(makeModel('PRIORITY')).resolve([0], outputs('A')).violation).toBeUndefined()
  })
})

describe('RULE ORDER', () => {
  it('lists all matches in table order', () => {
    const r = new HitPolicyResolver(makeModel('RULE ORDER')).resolve([0, 1], outputs('A', 'B'))
    expect(r.outputs).toEqual([{ Out: 'A' }, { Out: 'B' }])
  })
})

describe('COLLECT', () => {
  it('collects all matching outputs as a list when unaggregated', () => {
    const r = new HitPolicyResolver(makeModel('COLLECT')).resolve([0, 1], outputs('A', 'B'))
    expect(r.outputs).toEqual([{ Out: 'A' }, { Out: 'B' }])
    expect(r.aggregation).toBeUndefined()
  })

  it('SUM aggregates the matched output values', () => {
    const model = makeModel('COLLECT', { aggregation: 'SUM', outputType: 'integer' })
    const r = new HitPolicyResolver(model).resolve([0, 1], outputs(5, 10))
    expect(r.aggregation).toEqual({ fn: 'SUM', output: 'Out', value: 15 })
    expect(r.outputs).toEqual([])
  })

  it('reports null for MIN / MAX over no numeric values (not a fake 0)', () => {
    const min = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'MIN' })).resolve([0, 1], outputs('a', 'b'))
    const max = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'MAX' })).resolve([0, 1], outputs('a', 'b'))
    const sum = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'SUM' })).resolve([0, 1], outputs('a', 'b'))
    expect(min.aggregation?.value).toBeNull()
    expect(max.aggregation?.value).toBeNull()
    expect(sum.aggregation?.value).toBe(0) // sum of nothing is still 0
  })

  it('MIN / MAX / COUNT aggregate correctly', () => {
    const min = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'MIN', outputType: 'integer' })).resolve(
      [0, 1],
      outputs(5, 10),
    )
    const max = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'MAX', outputType: 'integer' })).resolve(
      [0, 1],
      outputs(5, 10),
    )
    const count = new HitPolicyResolver(makeModel('COLLECT', { aggregation: 'COUNT' })).resolve([0, 1], outputs(5, 10))
    expect(min.aggregation?.value).toBe(5)
    expect(max.aggregation?.value).toBe(10)
    expect(count.aggregation?.value).toBe(2)
  })
})

describe('no match', () => {
  it('returns empty results for every policy', () => {
    for (const policy of ['FIRST', 'UNIQUE', 'COLLECT', 'RULE ORDER', 'PRIORITY'] as HitPolicy[]) {
      const r = new HitPolicyResolver(makeModel(policy)).resolve([], {})
      expect(r.reportedRuleIndices).toEqual([])
      expect(r.outputs).toEqual([])
    }
  })
})
