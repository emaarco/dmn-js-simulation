/**
 * The plain, framework-free model a single DMN decision table is simulated
 * against. It carries only what evaluation needs — inputs, outputs, rules (as
 * raw FEEL text) and the hit policy. FEEL is never interpreted here (see
 * `utils/feel.ts`); the model is never read from dmn-js or XML here (see `adapter/`).
 */

export type HitPolicy = 'UNIQUE' | 'FIRST' | 'ANY' | 'PRIORITY' | 'COLLECT' | 'RULE ORDER' | 'OUTPUT ORDER'

export interface DmnInput {
  id: string
  /** Human label shown in the form (falls back to the input expression). */
  label: string
  /** The FEEL input expression, i.e. the variable name (e.g. `Season`). */
  expression: string
  /** DMN typeRef of the input (`string`, `integer`, `boolean`, …). */
  typeRef: string
  /** Distinct string literals used in this column — drives a dropdown. */
  options: string[]
  /**
   * Lower / upper bound for the native input's `min` / `max`, derived from the
   * column's rules. Only set when the column is fully bounded on that side (no
   * open-ended `<` / `>` test), so a value outside the range truly matches no
   * rule. Formatted for the native control (number string, or `yyyy-mm-dd`).
   */
  min?: string
  max?: string
}

export interface DmnOutput {
  id: string
  /** Key used in the result object — output name, else label, else fallback. */
  name: string
  label: string
  typeRef: string
  /**
   * Allowed output values in priority order (highest first), from
   * `<outputValues>`. Drives PRIORITY and OUTPUT ORDER; empty when unset.
   */
  priorityValues: string[]
}

/** COLLECT aggregator (`aggregation` attribute); undefined = plain list. */
export type Aggregation = 'SUM' | 'MIN' | 'MAX' | 'COUNT'

export interface DmnRule {
  id: string
  /** Raw FEEL unary-test text per input column (aligned to `inputs`). */
  inputEntries: string[]
  /** Raw FEEL expression text per output column (aligned to `outputs`). */
  outputEntries: string[]
}

export interface DecisionModel {
  decisionId: string
  decisionName: string
  hitPolicy: HitPolicy
  /** COLLECT aggregator, if any (`SUM`/`MIN`/`MAX`/`COUNT`). */
  aggregation?: Aggregation
  inputs: DmnInput[]
  outputs: DmnOutput[]
  rules: DmnRule[]
}

/** A raw form value before it is coerced to its DMN type. */
export type RawValue = string | number | boolean | null | undefined

export interface DecisionRequirementsDiagramInputData {
  id: string
  /** Variable name the value is bound to (what input expressions reference). */
  name: string
  /** Human-friendly label shown in the form (the InputData name; falls back to `name`). */
  label: string
  typeRef: string
}

export type DecisionLogic =
  { kind: 'decisionTable'; model: DecisionModel } | { kind: 'literalExpression'; expression: string } | { kind: 'none' }

export interface DecisionRequirementsDiagramDecision {
  id: string
  name: string
  /** Variable name the result is bound to for downstream decisions. */
  variableName: string
  requiredDecisionIds: string[]
  requiredInputIds: string[]
  logic: DecisionLogic
}

export interface DecisionRequirementsDiagramModel {
  inputData: DecisionRequirementsDiagramInputData[]
  decisions: DecisionRequirementsDiagramDecision[]
}
