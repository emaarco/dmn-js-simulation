/**
 * The source-independent half of reading a decision table: every default,
 * fallback and derived field of a `DecisionModel`. The XML and moddle readers
 * only extract plain strings into a `RawDecisionTable`; missing values are `''`.
 */

import type { Aggregation, DecisionModel, HitPolicy } from '../domain/model'
import { collectColumnBounds, collectColumnOptions, parseOutputValueList } from './util'

export interface RawDecisionTable {
  decisionId: string
  decisionName: string
  hitPolicy: string
  aggregation: string
  inputs: Array<{ id: string; label: string; expression: string; typeRef: string }>
  outputs: Array<{ id: string; name: string; label: string; typeRef: string; outputValues: string }>
  rules: Array<{ id: string; inputEntries: string[]; outputEntries: string[] }>
}

const AGGREGATIONS: Aggregation[] = ['SUM', 'MIN', 'MAX', 'COUNT']

export function buildDecisionModel(raw: RawDecisionTable): DecisionModel {
  const rules = raw.rules.map((rule, ri) => ({ ...rule, id: rule.id || `rule_${ri}` }))
  const aggregation = AGGREGATIONS.find(a => a === raw.aggregation.toUpperCase())

  const inputs = raw.inputs.map((input, ci) => {
    const typeRef = input.typeRef || 'string'
    const columnCells = rules.map(r => r.inputEntries[ci] ?? '')
    return {
      id: input.id || `input_${ci}`,
      label: input.label || input.expression || `Input ${ci + 1}`,
      expression: input.expression,
      typeRef,
      options: collectColumnOptions(columnCells),
      ...collectColumnBounds(columnCells, typeRef),
    }
  })

  const outputs = raw.outputs.map((output, ci) => {
    const name = output.name || output.label || `Output ${ci + 1}`
    return {
      id: output.id || `output_${ci}`,
      name,
      label: output.label || name,
      typeRef: output.typeRef || 'string',
      priorityValues: parseOutputValueList(output.outputValues),
    }
  })

  return {
    decisionId: raw.decisionId,
    decisionName: raw.decisionName,
    hitPolicy: (raw.hitPolicy || 'UNIQUE').toUpperCase() as HitPolicy,
    aggregation,
    inputs,
    outputs,
    rules,
  }
}
