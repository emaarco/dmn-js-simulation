/**
 * Build the domain `DecisionModel` from a dmn-js / dmn-moddle `businessObject`.
 *
 * This is the primary adapter inside a dmn-js modeler: the decision table is
 * already parsed into moddle elements (`dmn:DecisionTable` and friends), so we
 * read them directly — no XML, no DOM. FEEL is never interpreted here (see
 * `domain/evaluateDecision.ts`).
 *
 * Only the structural shape we read is typed (`ModdleElement`); the full
 * dmn-moddle type surface is intentionally not depended on.
 */

import type { DecisionModel } from '../domain/model'
import type {
  DecisionLogic,
  DecisionRequirementsDiagramDecision,
  DecisionRequirementsDiagramInputData,
  DecisionRequirementsDiagramModel,
} from '../domain/decisionRequirementsDiagram'
import { buildDecisionModel } from './buildDecisionModel'

/** The minimal structural view of a moddle businessObject that we read. */
export interface ModdleElement {
  $type: string
  $parent?: ModdleElement
  id?: string
  name?: string
  [key: string]: unknown
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asArray(value: unknown): ModdleElement[] {
  return Array.isArray(value) ? (value as ModdleElement[]) : []
}

/** Text of an entry element (`inputEntry` / `outputEntry` / `inputExpression`). */
function entryText(entry: ModdleElement | undefined): string {
  return str(entry?.text).trim()
}

/**
 * Map a `dmn:DecisionTable` businessObject to the domain `DecisionModel`.
 *
 * Pass the decision table element itself (in dmn-js: `sheet.getRoot().businessObject`).
 * The owning `dmn:Decision` is read from `$parent` for id/name.
 */
export function decisionTableToModel(decisionTable: ModdleElement): DecisionModel {
  if (!decisionTable || decisionTable.$type !== 'dmn:DecisionTable') {
    throw new Error('Expected a dmn:DecisionTable businessObject')
  }

  const decision = decisionTable.$parent
  return buildDecisionModel({
    decisionId: str(decision?.id),
    decisionName: str(decision?.name),
    hitPolicy: str(decisionTable.hitPolicy),
    aggregation: str(decisionTable.aggregation),
    inputs: asArray(decisionTable.input).map(input => {
      const expressionEl = input.inputExpression as ModdleElement | undefined
      return {
        id: str(input.id),
        label: str(input.label),
        expression: entryText(expressionEl),
        typeRef: str(expressionEl?.typeRef),
      }
    }),
    outputs: asArray(decisionTable.output).map(output => ({
      id: str(output.id),
      name: str(output.name),
      label: str(output.label),
      typeRef: str(output.typeRef),
      outputValues: entryText(output.outputValues as ModdleElement | undefined),
    })),
    rules: asArray(decisionTable.rule).map(rule => ({
      id: str(rule.id),
      inputEntries: asArray(rule.inputEntry).map(entryText),
      outputEntries: asArray(rule.outputEntry).map(entryText),
    })),
  })
}

/** Resolve a moddle reference (`requiredDecision` / `requiredInput`) to an id. */
function refId(ref: unknown): string {
  if (!ref || typeof ref !== 'object') return ''
  const r = ref as ModdleElement
  if (r.id) return str(r.id)
  const href = str(r.href)
  return href.startsWith('#') ? href.slice(1) : href
}

/** Map a decision's `decisionLogic` businessObject to the domain logic union. */
function toDecisionLogic(logic: ModdleElement | undefined): DecisionLogic {
  if (logic?.$type === 'dmn:DecisionTable') {
    return { kind: 'decisionTable', model: decisionTableToModel(logic) }
  }
  if (logic?.$type === 'dmn:LiteralExpression') {
    return { kind: 'literalExpression', expression: entryText(logic) }
  }
  return { kind: 'none' }
}

/**
 * Build the whole-graph `DecisionRequirementsDiagramModel` from a `dmn:Definitions` businessObject:
 * every InputData leaf and every Decision (with its logic and the ids of the
 * decisions / inputs it requires).
 */
export function definitionsToDecisionRequirementsDiagramModel(
  definitions: ModdleElement,
): DecisionRequirementsDiagramModel {
  if (!definitions || definitions.$type !== 'dmn:Definitions') {
    throw new Error('Expected a dmn:Definitions businessObject')
  }

  const drgElements = asArray(definitions.drgElement)

  const inputData: DecisionRequirementsDiagramInputData[] = drgElements
    .filter(el => el.$type === 'dmn:InputData')
    .map(el => {
      const variable = el.variable as ModdleElement | undefined
      const name = str(variable?.name) || str(el.name) || str(el.id)
      return {
        id: str(el.id),
        name,
        // Prefer the InputData's display name for the label; the variable name
        // (`name`) stays the key that input expressions reference.
        label: str(el.name) || name,
        typeRef: str(variable?.typeRef) || 'string',
      }
    })

  const decisions: DecisionRequirementsDiagramDecision[] = drgElements
    .filter(el => el.$type === 'dmn:Decision')
    .map(el => {
      const variable = el.variable as ModdleElement | undefined
      const requirements = asArray(el.informationRequirement)
      return {
        id: str(el.id),
        name: str(el.name) || str(el.id),
        variableName: str(variable?.name) || str(el.name) || str(el.id),
        requiredDecisionIds: requirements.map(ir => refId(ir.requiredDecision)).filter(Boolean),
        requiredInputIds: requirements.map(ir => refId(ir.requiredInput)).filter(Boolean),
        logic: toDecisionLogic(el.decisionLogic as ModdleElement | undefined),
      }
    })

  return { inputData, decisions }
}
