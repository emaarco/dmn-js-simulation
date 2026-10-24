/**
 * Framework-free simulation state for a single decision table: the current model,
 * the input values the user has entered, and the last evaluation result. The UI
 * subscribes to re-render, and the dmn-js integration subscribes to drive row
 * highlighting. It knows nothing about dmn-js or the DOM.
 */

import type { DecisionModel, RawValue } from '../domain/model'
import type { EvaluationResult } from '../domain/results'
import { DecisionTableEvaluator } from '../domain/DecisionTableEvaluator'
import type { ModelerBridge } from './ModelerBridge'
import { Observable } from './Observable'

export class SimulationStore extends Observable {
  private model: DecisionModel | null = null
  private values: RawValue[] = []
  private result: EvaluationResult | null = null
  /** Whether `result` came from a local `run()` vs a reflected DRD run. */
  private resultIsLocal = false
  private bridge: ModelerBridge | null = null

  getModel(): DecisionModel | null {
    return this.model
  }

  getValues(): RawValue[] {
    return this.values
  }

  getResult(): EvaluationResult | null {
    return this.result
  }

  /**
   * Adopt a (re)built decision table. Values the user already entered are kept
   * for inputs that still exist (matched by id), so a live edit does not wipe
   * the form; the previous result is dropped because rules or outputs may have
   * changed. An unchanged model is ignored.
   */
  setModel(model: DecisionModel | null): void {
    if (model && this.model && this.sameModel(this.model, model)) return
    const previous = this.model
    const previousValues = this.values
    this.model = model
    this.values = (model?.inputs ?? []).map(input => {
      const previousIndex = previous ? previous.inputs.findIndex(p => p.id === input.id) : -1
      return previousIndex >= 0 ? (previousValues[previousIndex] ?? '') : ''
    })
    this.clearResult()
    this.notify()
    this.reflectBridge()
  }

  /**
   * Follow a DRD run published on the bridge: the decision's reflected inputs
   * and result are shown until the user runs the table locally. Returns a
   * disconnect function.
   */
  connectBridge(bridge: ModelerBridge): () => void {
    this.bridge = bridge
    const unsubscribe = bridge.subscribe(() => this.reflectBridge())
    this.reflectBridge()
    return () => {
      unsubscribe()
      this.bridge = null
    }
  }

  /** Set one input value; any change invalidates the previous run. */
  setValue(index: number, value: RawValue): void {
    if (index < 0 || index >= this.values.length) return
    this.values = this.values.map((v, i) => (i === index ? value : v))
    this.clearResult()
    this.notify()
  }

  /** Evaluate the table against the current inputs (empty ones as `null`) and store the result. */
  run(): EvaluationResult | null {
    if (!this.model) return null
    this.result = new DecisionTableEvaluator(this.model).evaluate(this.values)
    this.resultIsLocal = true
    this.notify()
    return this.result
  }

  /** Clear inputs and result (keeps the model). */
  reset(): void {
    this.values = this.values.map(() => '')
    this.clearResult()
    this.notify()
  }

  private reflectBridge(): void {
    const decisionId = this.model?.decisionId
    if (!this.bridge || !decisionId || this.resultIsLocal) return
    const reflection = this.bridge.getTableReflection(decisionId)
    if (!reflection) this.dropReflectedResult()
    else if (this.result !== reflection.result) this.reflect(reflection.inputs, reflection.result)
  }

  /**
   * Show a result computed by a DRD run for the decision the user drilled into:
   * seed the inputs that produced it and the result, without a local run.
   * Ignored on an input-arity mismatch.
   */
  private reflect(values: RawValue[], result: EvaluationResult): void {
    if (!this.model || values.length !== this.model.inputs.length) return
    this.values = [...values]
    this.result = result
    this.resultIsLocal = false
    this.notify()
  }

  /**
   * Drop a reflected DRD result when that run is cleared, so a drilled-in table
   * stops showing the stale outcome. The reflected input values are kept so the
   * user can re-run from here.
   */
  private dropReflectedResult(): void {
    if (this.result === null) return
    this.result = null
    this.notify()
  }

  private clearResult(): void {
    this.result = null
    this.resultIsLocal = false
  }

  private sameModel(a: DecisionModel, b: DecisionModel): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }
}
