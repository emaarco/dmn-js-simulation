/**
 * The source-independent half of reading a decision table: every default,
 * fallback and derived field of a `DecisionModel`. The XML and moddle readers
 * only extract plain strings into a `RawDecisionTable`; missing values are `''`.
 */

import type { Aggregation, DecisionModel, DmnInput, DmnOutput, DmnRule, HitPolicy } from '../domain/model'
import { collectColumnBounds, collectColumnOptions, parseOutputValueList } from './utils/columnHints'

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

export class DecisionModelBuilder {
  build(raw: RawDecisionTable): DecisionModel {
    const rules = raw.rules.map((rule, ri) => ({ ...rule, id: rule.id || `rule_${ri}` }))
    return {
      decisionId: raw.decisionId,
      decisionName: raw.decisionName,
      hitPolicy: (raw.hitPolicy || 'UNIQUE').toUpperCase() as HitPolicy,
      aggregation: AGGREGATIONS.find(a => a === raw.aggregation.toUpperCase()),
      inputs: raw.inputs.map((input, ci) => this.buildInput(input, ci, rules)),
      outputs: raw.outputs.map((output, ci) => this.buildOutput(output, ci)),
      rules,
    }
  }

  private buildInput(input: RawDecisionTable['inputs'][number], ci: number, rules: DmnRule[]): DmnInput {
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
  }

  private buildOutput(output: RawDecisionTable['outputs'][number], ci: number): DmnOutput {
    const name = output.name || output.label || `Output ${ci + 1}`
    return {
      id: output.id || `output_${ci}`,
      name,
      label: output.label || name,
      typeRef: output.typeRef || 'string',
      priorityValues: parseOutputValueList(output.outputValues),
    }
  }
}
