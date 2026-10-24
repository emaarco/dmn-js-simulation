/**
 * Build domain models from a dmn-js / dmn-moddle `businessObject`.
 *
 * This is the primary reader inside a dmn-js modeler: the definitions are
 * already parsed into moddle elements (`dmn:DecisionTable` and friends), so we
 * read them directly — no XML, no DOM. FEEL is never interpreted here.
 */

import type {
  DecisionLogic,
  DecisionModel,
  DecisionRequirementsDiagramDecision,
  DecisionRequirementsDiagramInputData,
  DecisionRequirementsDiagramModel,
} from '../domain/model'
import { DecisionModelBuilder } from './DecisionModelBuilder'
import { elementsOf, entryText, referencedId, stringOf, type ModdleElement } from './utils/moddle'

export class DmnModdleReader {
  private readonly builder = new DecisionModelBuilder()

  /**
   * Map a `dmn:DecisionTable` businessObject to the domain `DecisionModel`.
   *
   * Pass the decision table element itself (in dmn-js: `sheet.getRoot().businessObject`).
   * The owning `dmn:Decision` is read from `$parent` for id/name.
   */
  readDecisionTable(decisionTable: ModdleElement): DecisionModel {
    if (!decisionTable || decisionTable.$type !== 'dmn:DecisionTable') {
      throw new Error('Expected a dmn:DecisionTable businessObject')
    }

    const decision = decisionTable.$parent
    return this.builder.build({
      decisionId: stringOf(decision?.id),
      decisionName: stringOf(decision?.name),
      hitPolicy: stringOf(decisionTable.hitPolicy),
      aggregation: stringOf(decisionTable.aggregation),
      inputs: elementsOf(decisionTable.input).map(input => {
        const expressionElement = input.inputExpression as ModdleElement | undefined
        return {
          id: stringOf(input.id),
          label: stringOf(input.label),
          expression: entryText(expressionElement),
          typeRef: stringOf(expressionElement?.typeRef),
        }
      }),
      outputs: elementsOf(decisionTable.output).map(output => ({
        id: stringOf(output.id),
        name: stringOf(output.name),
        label: stringOf(output.label),
        typeRef: stringOf(output.typeRef),
        outputValues: entryText(output.outputValues as ModdleElement | undefined),
      })),
      rules: elementsOf(decisionTable.rule).map(rule => ({
        id: stringOf(rule.id),
        inputEntries: elementsOf(rule.inputEntry).map(entryText),
        outputEntries: elementsOf(rule.outputEntry).map(entryText),
      })),
    })
  }

  /**
   * Build the whole-graph `DecisionRequirementsDiagramModel` from a `dmn:Definitions` businessObject:
   * every InputData leaf and every Decision (with its logic and the ids of the
   * decisions / inputs it requires).
   */
  readDecisionRequirementsDiagram(definitions: ModdleElement): DecisionRequirementsDiagramModel {
    if (!definitions || definitions.$type !== 'dmn:Definitions') {
      throw new Error('Expected a dmn:Definitions businessObject')
    }

    const drgElements = elementsOf(definitions.drgElement)
    return {
      inputData: drgElements.filter(el => el.$type === 'dmn:InputData').map(el => this.readInputData(el)),
      decisions: drgElements.filter(el => el.$type === 'dmn:Decision').map(el => this.readDecision(el)),
    }
  }

  private readInputData(element: ModdleElement): DecisionRequirementsDiagramInputData {
    const variable = element.variable as ModdleElement | undefined
    const name = stringOf(variable?.name) || stringOf(element.name) || stringOf(element.id)
    return {
      id: stringOf(element.id),
      name,
      // Prefer the InputData's display name for the label; the variable name
      // (`name`) stays the key that input expressions reference.
      label: stringOf(element.name) || name,
      typeRef: stringOf(variable?.typeRef) || 'string',
    }
  }

  private readDecision(element: ModdleElement): DecisionRequirementsDiagramDecision {
    const variable = element.variable as ModdleElement | undefined
    const requirements = elementsOf(element.informationRequirement)
    return {
      id: stringOf(element.id),
      name: stringOf(element.name) || stringOf(element.id),
      variableName: stringOf(variable?.name) || stringOf(element.name) || stringOf(element.id),
      requiredDecisionIds: requirements.map(ir => referencedId(ir.requiredDecision)).filter(Boolean),
      requiredInputIds: requirements.map(ir => referencedId(ir.requiredInput)).filter(Boolean),
      logic: this.readDecisionLogic(element.decisionLogic as ModdleElement | undefined),
    }
  }

  private readDecisionLogic(logic: ModdleElement | undefined): DecisionLogic {
    if (logic?.$type === 'dmn:DecisionTable') {
      return { kind: 'decisionTable', model: this.readDecisionTable(logic) }
    }
    if (logic?.$type === 'dmn:LiteralExpression') {
      return { kind: 'literalExpression', expression: entryText(logic) }
    }
    return { kind: 'none' }
  }
}
