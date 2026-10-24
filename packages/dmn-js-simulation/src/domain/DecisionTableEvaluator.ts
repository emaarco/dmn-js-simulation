/**
 * Evaluate a parsed DMN decision table against user-supplied input values:
 * coerce inputs, run each rule's FEEL unary tests to find matches, evaluate the
 * matched rules' output expressions, then let the hit policy decide the result.
 */

import type { DecisionModel, RawValue } from './model'
import type { EvaluationResult, RuleOutput } from './results'
import { HitPolicyResolver } from './HitPolicyResolver'
import { coerceValue, evaluateExpression, evaluateUnaryTest } from './utils/feel'

export class DecisionTableEvaluator {
  private readonly hitPolicy: HitPolicyResolver

  constructor(private readonly model: DecisionModel) {
    this.hitPolicy = new HitPolicyResolver(model)
  }

  /** Evaluate against raw form values, coercing each by its input's typeRef. */
  evaluate(rawValues: RawValue[]): EvaluationResult {
    return this.evaluateFeelValues(this.model.inputs.map((input, i) => coerceValue(rawValues[i], input.typeRef)))
  }

  /** Evaluate against values that are already FEEL values (`undefined` = missing). */
  evaluateFeelValues(values: unknown[]): EvaluationResult {
    const context = this.outputContext(values)

    const matchedRuleIndices: number[] = []
    this.model.rules.forEach((rule, ri) => {
      if (this.model.inputs.every((_, ci) => this.inputCellMatches(rule.inputEntries[ci], values[ci]))) {
        matchedRuleIndices.push(ri)
      }
    })

    const outputsByRule: Record<number, RuleOutput> = {}
    for (const ri of matchedRuleIndices) outputsByRule[ri] = this.ruleOutput(ri, context)

    return { matchedRuleIndices, ...this.hitPolicy.resolve(matchedRuleIndices, outputsByRule) }
  }

  /**
   * Context for output expressions: bind each input by its FEEL expression and
   * by its label so literal *or* referencing outputs both resolve.
   */
  private outputContext(values: unknown[]): Record<string, unknown> {
    const context: Record<string, unknown> = {}
    this.model.inputs.forEach((input, i) => {
      if (values[i] === undefined) return
      if (input.expression) context[input.expression] = values[i]
      if (input.label) context[input.label] = values[i]
    })
    return context
  }

  /**
   * Whether an input cell matches a value. An empty cell or a dash always matches
   * (DMN "any"); a missing value is tested as FEEL `null`, so only tests that
   * accept `null` (e.g. `null`) match it.
   */
  private inputCellMatches(cellText: string, value: unknown): boolean {
    const text = (cellText || '').trim()
    if (text === '' || text === '-') return true
    return evaluateUnaryTest(text, value ?? null)
  }

  /** Evaluate every output cell of a rule into an object keyed by output name. */
  private ruleOutput(ruleIndex: number, context: Record<string, unknown>): RuleOutput {
    const rule = this.model.rules[ruleIndex]
    const output: RuleOutput = {}
    this.model.outputs.forEach((column, ci) => {
      const text = (rule.outputEntries[ci] || '').trim()
      output[column.name] = text === '' ? null : evaluateExpression(text, context)
    })
    return output
  }
}
