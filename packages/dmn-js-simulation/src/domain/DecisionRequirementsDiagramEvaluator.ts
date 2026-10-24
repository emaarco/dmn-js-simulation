/**
 * DRD (whole-graph) evaluation: chain multiple decisions where one decision's
 * output feeds another's input, following DMN information requirements. The
 * decisions are topologically ordered, each is evaluated (decision table or
 * literal expression) and its result is threaded into downstream contexts.
 */

import type {
  DecisionModel,
  DecisionRequirementsDiagramDecision,
  DecisionRequirementsDiagramModel,
  RawValue,
} from './model'
import type { DecisionEvaluation, DecisionRequirementsDiagramEvaluationResult, EvaluationResult } from './results'
import { DecisionTableEvaluator } from './DecisionTableEvaluator'
import { coerceValue, evaluateExpression } from './utils/feel'

export class DecisionRequirementsDiagramEvaluator {
  constructor(private readonly model: DecisionRequirementsDiagramModel) {}

  /** @param inputValues raw values keyed by InputData **id** */
  evaluate(inputValues: Record<string, RawValue>): DecisionRequirementsDiagramEvaluationResult {
    const context = this.inputDataContext(inputValues)
    const byId = new Map(this.model.decisions.map(d => [d.id, d]))
    const { order, cyclic } = this.topologicalOrder()
    const results: Record<string, DecisionEvaluation> = {}
    const skipped = new Set<string>()

    for (const id of order) {
      const decision = byId.get(id) as DecisionRequirementsDiagramDecision
      // A decision whose required decision was skipped (no logic, or itself
      // skipped) cannot be resolved — its input would silently be `null`, yielding
      // a bogus result. Propagate the skip instead of evaluating.
      if (decision.requiredDecisionIds.some(req => skipped.has(req))) {
        results[id] = this.skippedEvaluation(id)
        skipped.add(id)
        continue
      }
      const evaluation = this.evaluateDecision(decision, context)
      results[id] = evaluation
      if (evaluation.skipped) skipped.add(id)
      else context[decision.variableName] = evaluation.value
    }

    for (const id of cyclic) results[id] = this.skippedEvaluation(id)

    return { order, results }
  }

  /** Seed the FEEL context with the coerced input-data values, bound by name. */
  private inputDataContext(inputValues: Record<string, RawValue>): Record<string, unknown> {
    const context: Record<string, unknown> = {}
    for (const input of this.model.inputData) {
      const coerced = coerceValue(inputValues[input.id], input.typeRef)
      if (coerced !== undefined) context[input.name] = coerced
    }
    return context
  }

  /**
   * Topologically order the decisions by their decision→decision requirements
   * (Kahn's algorithm). Decisions left over form a cycle and are returned last so
   * they can be marked skipped.
   */
  private topologicalOrder(): { order: string[]; cyclic: string[] } {
    const { decisions } = this.model
    const ids = new Set(decisions.map(d => d.id))
    const indegree = new Map<string, number>()
    const dependents = new Map<string, string[]>()

    for (const d of decisions) indegree.set(d.id, 0)
    for (const d of decisions) {
      for (const req of d.requiredDecisionIds) {
        if (!ids.has(req)) continue // requirement outside this graph — ignore
        indegree.set(d.id, (indegree.get(d.id) ?? 0) + 1)
        dependents.set(req, [...(dependents.get(req) ?? []), d.id])
      }
    }

    const queue = decisions.filter(d => (indegree.get(d.id) ?? 0) === 0).map(d => d.id)
    const order: string[] = []
    while (queue.length) {
      const id = queue.shift() as string
      order.push(id)
      for (const dep of dependents.get(id) ?? []) {
        indegree.set(dep, (indegree.get(dep) ?? 0) - 1)
        if ((indegree.get(dep) ?? 0) === 0) queue.push(dep)
      }
    }

    const cyclic = decisions.filter(d => !order.includes(d.id)).map(d => d.id)
    return { order, cyclic }
  }

  private evaluateDecision(
    decision: DecisionRequirementsDiagramDecision,
    context: Record<string, unknown>,
  ): DecisionEvaluation {
    const { logic } = decision

    if (logic.kind === 'decisionTable') {
      // Resolve each table input from the context via its FEEL input expression.
      const values = logic.model.inputs.map(input =>
        input.expression ? (evaluateExpression(input.expression, context) ?? undefined) : undefined,
      )
      const table = new DecisionTableEvaluator(logic.model).evaluateFeelValues(values)
      const inputs = values as RawValue[]
      return { decisionId: decision.id, value: this.decisionTableValue(logic.model, table), table, inputs }
    }

    if (logic.kind === 'literalExpression') {
      return { decisionId: decision.id, value: evaluateExpression(logic.expression, context) }
    }

    return this.skippedEvaluation(decision.id)
  }

  /** The single value a decision contributes downstream, given its table result. */
  private decisionTableValue(model: DecisionModel, evaluation: EvaluationResult): unknown {
    if (evaluation.aggregation) return evaluation.aggregation.value
    if (evaluation.outputs.length === 0) return null
    if (model.outputs.length === 1) {
      const name = model.outputs[0].name
      const values = evaluation.outputs.map(output => output[name])
      return values.length === 1 ? values[0] : values
    }
    return evaluation.outputs.length === 1 ? evaluation.outputs[0] : evaluation.outputs
  }

  private skippedEvaluation(decisionId: string): DecisionEvaluation {
    return { decisionId, value: null, skipped: true }
  }
}
