// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DmnXmlReader } from '../../src/adapter/DmnXmlReader'
import { DecisionTableEvaluator } from '../../src/domain/DecisionTableEvaluator'

/**
 * End-to-end tests for the orchestrator: parse → FEEL matching → output
 * evaluation → hit policy, exercised through real DMN XML. Isolated FEEL and
 * hit-policy behaviour is covered in domain/feel.test.ts / domain/hitPolicy.test.ts.
 */
const exampleXml = readFileSync(resolve(process.cwd(), 'test/fixtures/example.dmn'), 'utf-8')
const dish = new DmnXmlReader().readDecisionTable(exampleXml)

describe('DecisionTableEvaluator — FIRST decision table (example.dmn)', () => {
  it('fires the first matching rule and returns its output', () => {
    const r = new DecisionTableEvaluator(dish).evaluate(['Fall', 8])
    expect(r.matchedRuleIndices).toEqual([0])
    expect(r.reportedRuleIndices).toEqual([0])
    expect(r.outputs).toEqual([{ Dish: 'Spareribs' }])
  })

  it('evaluates numeric unary tests (<= / >)', () => {
    expect(new DecisionTableEvaluator(dish).evaluate(['Winter', 8]).outputs).toEqual([{ Dish: 'Roastbeef' }])
    expect(new DecisionTableEvaluator(dish).evaluate(['Spring', 4]).outputs).toEqual([
      { Dish: 'Dry Aged Gourmet Steak' },
    ])
    expect(new DecisionTableEvaluator(dish).evaluate(['Spring', 5]).outputs).toEqual([{ Dish: 'Stew' }])
  })

  it('treats an empty input cell as a wildcard match', () => {
    // Rule 5 (Summer) has an empty guest-count cell — any count matches.
    const r = new DecisionTableEvaluator(dish).evaluate(['Summer', 999])
    expect(r.matchedRuleIndices).toEqual([4])
    expect(r.outputs).toEqual([{ Dish: 'Light Salad and a nice Steak' }])
  })

  it('reports no match when nothing fires', () => {
    const r = new DecisionTableEvaluator(dish).evaluate(['Fall', 20])
    expect(r.matchedRuleIndices).toEqual([])
    expect(r.outputs).toEqual([])
  })

  it('does not match a concrete test when the input is missing', () => {
    expect(new DecisionTableEvaluator(dish).evaluate(['', '']).matchedRuleIndices).toEqual([])
  })
})

describe('DecisionTableEvaluator — date input (end-to-end)', () => {
  const dateModel = new DmnXmlReader().readDecisionTable(
    readFileSync(resolve(process.cwd(), 'test/fixtures/date.dmn'), 'utf-8'),
  )

  it('coerces a date input and matches temporal unary tests', () => {
    expect(new DecisionTableEvaluator(dateModel).evaluate(['2020-01-15']).outputs).toEqual([{ Season: 'First Half' }])
    expect(new DecisionTableEvaluator(dateModel).evaluate(['2020-07-15']).outputs).toEqual([{ Season: 'Summer' }])
    expect(new DecisionTableEvaluator(dateModel).evaluate(['2020-11-15']).outputs).toEqual([{ Season: 'Second Half' }])
  })

  it('reports no match for an unparseable date', () => {
    expect(new DecisionTableEvaluator(dateModel).evaluate(['not-a-date']).matchedRuleIndices).toEqual([])
  })
})

describe('DecisionTableEvaluator — COLLECT with SUM aggregation (end-to-end)', () => {
  const sumXml = `<?xml version="1.0" encoding="UTF-8"?>
    <definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="d">
      <decision id="Decision_Points" name="Points">
        <decisionTable id="T" hitPolicy="COLLECT" aggregation="SUM">
          <input id="i"><inputExpression id="ie" typeRef="integer"><text>Cart</text></inputExpression></input>
          <output id="o" label="Points" name="Points" typeRef="integer" />
          <rule id="r1"><inputEntry id="e1"><text>&gt;= 50</text></inputEntry><outputEntry id="oe1"><text>5</text></outputEntry></rule>
          <rule id="r2"><inputEntry id="e2"><text>&gt;= 100</text></inputEntry><outputEntry id="oe2"><text>10</text></outputEntry></rule>
          <rule id="r3"><inputEntry id="e3"><text>&gt;= 200</text></inputEntry><outputEntry id="oe3"><text>20</text></outputEntry></rule>
        </decisionTable>
      </decision>
    </definitions>`

  it('matches every applicable rule and aggregates their outputs', () => {
    const model = new DmnXmlReader().readDecisionTable(sumXml)
    const r = new DecisionTableEvaluator(model).evaluate([250])
    expect(r.matchedRuleIndices).toEqual([0, 1, 2])
    expect(r.aggregation).toEqual({ fn: 'SUM', output: 'Points', value: 35 })
    expect(r.outputs).toEqual([])
  })
})
