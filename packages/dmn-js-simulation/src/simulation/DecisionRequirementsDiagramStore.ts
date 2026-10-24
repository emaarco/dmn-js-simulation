/**
 * Framework-free simulation state for a whole DRD: the graph model, the values
 * entered per InputData id and the last run. A run is published to the shared
 * `ModelerBridge` so drilled-in decision tables can reflect it. It knows
 * nothing about diagram-js or the DOM.
 */

import type { DecisionRequirementsDiagramModel, RawValue } from '../domain/model'
import type { DecisionRequirementsDiagramEvaluationResult } from '../domain/results'
import { DecisionRequirementsDiagramEvaluator } from '../domain/DecisionRequirementsDiagramEvaluator'
import type { ModelerBridge } from './ModelerBridge'
import { Observable } from './Observable'

export class DecisionRequirementsDiagramStore extends Observable {
  private model: DecisionRequirementsDiagramModel | null = null
  private values: Record<string, RawValue> = {}
  private result: DecisionRequirementsDiagramEvaluationResult | null = null

  constructor(private readonly bridge: ModelerBridge | null) {
    super()
  }

  getModel(): DecisionRequirementsDiagramModel | null {
    return this.model
  }

  getValues(): Record<string, RawValue> {
    return this.values
  }

  getResult(): DecisionRequirementsDiagramEvaluationResult | null {
    return this.result
  }

  /** A lone decision is covered by the table simulation; only a real graph with inputs is worth simulating. */
  isSimulatable(): boolean {
    return !!this.model && this.model.decisions.length > 1 && this.model.inputData.length > 0
  }

  setModel(model: DecisionRequirementsDiagramModel | null): void {
    this.model = model
    this.values = {}
    this.clearResult()
    this.notify()
  }

  setValue(inputId: string, value: RawValue): void {
    this.values = { ...this.values, [inputId]: value }
    this.notify()
  }

  run(): void {
    if (!this.model) return
    this.result = new DecisionRequirementsDiagramEvaluator(this.model).evaluate(this.values)
    this.bridge?.publish(this.result)
    this.notify()
  }

  reset(): void {
    this.values = {}
    this.clearResult()
    this.notify()
  }

  /** Decisions that produced something: a matching rule, or a non-null literal value. */
  firedDecisionIds(): string[] {
    if (!this.result) return []
    const { results } = this.result
    return this.result.order.filter(id => {
      const evaluation = results[id]
      if (!evaluation || evaluation.skipped) return false
      return evaluation.table
        ? evaluation.table.matchedRuleIndices.length > 0
        : evaluation.value !== null && evaluation.value !== undefined
    })
  }

  private clearResult(): void {
    this.result = null
    this.bridge?.clear()
  }
}
