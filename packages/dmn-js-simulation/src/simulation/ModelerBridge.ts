/**
 * Cross-view bridge for a single dmn-js Modeler/Viewer.
 *
 * The DRD view and the decision-table view are separate viewer instances with
 * separate injectors; the only thing they share is the parent Manager (dmn-js
 * injects it as `_parent`). This bridge hangs off that shared parent so a DRD
 * simulation run can be reflected when the user drills into a decision table:
 * the per-decision table results are published here, keyed by decision id.
 *
 * There is one bridge per parent, held in a WeakMap, so it is garbage-collected
 * with the modeler.
 */

import type { RawValue } from '../domain/model'
import type { DecisionRequirementsDiagramEvaluationResult, EvaluationResult } from '../domain/results'
import { Observable } from './Observable'

/** A decision's outcome from a DRD run: its result plus the inputs that produced it. */
export interface TableReflection {
  result: EvaluationResult
  inputs: RawValue[]
}

export class ModelerBridge extends Observable {
  private static readonly bridgesByParent = new WeakMap<object, ModelerBridge>()

  private tableReflections = new Map<string, TableReflection>()

  /** Get (or lazily create) the bridge for a dmn-js parent Manager. */
  static forParent(parent: unknown): ModelerBridge | null {
    if (!parent || typeof parent !== 'object') return null
    let bridge = ModelerBridge.bridgesByParent.get(parent)
    if (!bridge) {
      bridge = new ModelerBridge()
      ModelerBridge.bridgesByParent.set(parent, bridge)
    }
    return bridge
  }

  /** Publish a DRD run: keep the per-decision table results for reflection. */
  publish(result: DecisionRequirementsDiagramEvaluationResult): void {
    this.tableReflections = new Map()
    for (const [decisionId, evaluation] of Object.entries(result.results)) {
      if (evaluation.table) {
        this.tableReflections.set(decisionId, { result: evaluation.table, inputs: evaluation.inputs ?? [] })
      }
    }
    this.notify()
  }

  /** The reflection (result + inputs) for a decision from the last DRD run. */
  getTableReflection(decisionId: string): TableReflection | null {
    return this.tableReflections.get(decisionId) ?? null
  }

  clear(): void {
    if (this.tableReflections.size === 0) return
    this.tableReflections = new Map()
    this.notify()
  }
}
