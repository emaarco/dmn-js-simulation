/**
 * Framework-free simulation state for a whole DRD: the graph model, the values
 * entered per InputData id and the last run. A run is published to the shared
 * `ModelerBridge` so drilled-in decision tables can reflect it. It knows
 * nothing about diagram-js or the DOM.
 */

import type { RawValue } from './../domain/feel'
import {
  evaluateDecisionRequirementsDiagram,
  type DecisionRequirementsDiagramEvaluationResult,
  type DecisionRequirementsDiagramModel,
} from './../domain/decisionRequirementsDiagram'
import type { ModelerBridge } from './ModelerBridge'

export type DecisionRequirementsDiagramListener = () => void

export class DecisionRequirementsDiagramStore {
  private model: DecisionRequirementsDiagramModel | null = null
  private values: Record<string, RawValue> = {}
  private result: DecisionRequirementsDiagramEvaluationResult | null = null
  private readonly listeners = new Set<DecisionRequirementsDiagramListener>()

  constructor(private readonly bridge: ModelerBridge | null) {}

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
    this.emit()
  }

  setValue(inputId: string, value: RawValue): void {
    this.values = { ...this.values, [inputId]: value }
    this.emit()
  }

  run(): void {
    if (!this.model) return
    this.result = evaluateDecisionRequirementsDiagram(this.model, this.values)
    this.bridge?.setDecisionRequirementsDiagramResult(this.result)
    this.emit()
  }

  reset(): void {
    this.values = {}
    this.clearResult()
    this.emit()
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

  subscribe(listener: DecisionRequirementsDiagramListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private clearResult(): void {
    this.result = null
    this.bridge?.clear()
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener()
  }
}
