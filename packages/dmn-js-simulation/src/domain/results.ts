/**
 * What evaluating a decision table or a whole DRD produces. Plain data, so a
 * result can be published across views and compared by identity.
 */

import type { Aggregation, RawValue } from './model'

/** A single evaluated rule output, keyed by output name. */
export type RuleOutput = Record<string, unknown>

export interface AggregationResult {
  fn: Aggregation
  /** Name of the (single) output the aggregate was computed over. */
  output: string
  /** `null` for MIN/MAX over an empty set — no real minimum/maximum exists. */
  value: number | null
}

export interface HitPolicyResult {
  /** Rules whose output forms the result after the hit policy is applied. */
  reportedRuleIndices: number[]
  /** Output objects for the reported rules (empty when an aggregation applies). */
  outputs: RuleOutput[]
  /** Present for COLLECT with an aggregation (SUM/MIN/MAX/COUNT). */
  aggregation?: AggregationResult
  /** Set when the policy's constraint is violated (e.g. UNIQUE matched twice). */
  violation?: string
}

export interface EvaluationResult extends HitPolicyResult {
  /** Every rule that matched, in table order — drives row highlighting. */
  matchedRuleIndices: number[]
}

export interface DecisionEvaluation {
  decisionId: string
  /** The value bound into downstream contexts (scalar, list or object). */
  value: unknown
  /** Present for decision-table decisions — drives per-table row highlighting. */
  table?: EvaluationResult
  /**
   * The concrete input values fed to a decision-table decision (in table input
   * order), resolved from the graph context. Lets the table view reflect the
   * exact scenario when the user drills into this decision.
   */
  inputs?: RawValue[]
  /** Set when the decision was not evaluated (unresolved dependency / cycle). */
  skipped?: boolean
}

export interface DecisionRequirementsDiagramEvaluationResult {
  /** Decision ids in evaluation (topological) order. */
  order: string[]
  /** Result per decision id. */
  results: Record<string, DecisionEvaluation>
}
