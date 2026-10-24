/**
 * Public entry point for `@emaarco/dmn-js-simulation`: the framework-free
 * evaluation core, the DMN readers, the simulation store, and the dmn-js
 * integration modules.
 */

// Domain — pure evaluation core
export { DecisionTableEvaluator } from './domain/DecisionTableEvaluator'
export { DecisionRequirementsDiagramEvaluator } from './domain/DecisionRequirementsDiagramEvaluator'
export { HitPolicyResolver } from './domain/HitPolicyResolver'
export { coerceValue, evaluateUnaryTest, evaluateExpression } from './domain/utils/feel'
export { isNumericType } from './domain/utils/dmnType'
export type {
  Aggregation,
  DecisionLogic,
  DecisionModel,
  DecisionRequirementsDiagramDecision,
  DecisionRequirementsDiagramInputData,
  DecisionRequirementsDiagramModel,
  DmnInput,
  DmnOutput,
  DmnRule,
  HitPolicy,
  RawValue,
} from './domain/model'
export type {
  AggregationResult,
  DecisionEvaluation,
  DecisionRequirementsDiagramEvaluationResult,
  EvaluationResult,
  HitPolicyResult,
  RuleOutput,
} from './domain/results'

// Adapter — build models from raw DMN XML or a live dmn-js / dmn-moddle businessObject
export { DmnXmlReader } from './adapter/DmnXmlReader'
export { DmnModdleReader } from './adapter/DmnModdleReader'
export type { ModdleElement } from './adapter/utils/moddle'

// Simulation store — framework-free run/result state (shared across views)
export { SimulationStore } from './simulation/SimulationStore'
export { ModelerBridge, type TableReflection } from './simulation/ModelerBridge'

// dmn-js integration modules — register via `additionalModules`
export { default, DmnSimulationTableModule, DmnSimulationDecisionRequirementsDiagramModule } from './integration'
