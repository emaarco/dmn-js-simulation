/**
 * Parse a DMN decision table from raw XML into the domain `DecisionModel`.
 *
 * This is the fallback reader for consumers who have DMN XML but no live
 * dmn-js instance. Inside a dmn-js modeler, prefer `DmnModdleReader`, which
 * reads the already-parsed businessObject and needs no DOM. Only the parts a
 * single decision table needs are extracted; FEEL is never interpreted here.
 */

import type { DecisionModel } from '../domain/model'
import { DecisionModelBuilder } from './DecisionModelBuilder'

export class DmnXmlReader {
  private readonly builder = new DecisionModelBuilder()

  /**
   * Read the first decision table (or the one matching `decisionId`) from a DMN
   * XML string.
   *
   * @throws if the XML is malformed or contains no decision table.
   */
  readDecisionTable(xml: string, decisionId?: string): DecisionModel {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (this.firstByLocalName(doc, 'parsererror')) {
      throw new Error('DMN XML could not be parsed')
    }

    const decisions = this.byLocalName(doc, 'decision')
    const decision = decisionId
      ? decisions.find(d => d.getAttribute('id') === decisionId)
      : decisions.find(d => this.firstByLocalName(d, 'decisionTable'))
    if (!decision) {
      throw new Error(
        decisionId ? `No decision with id "${decisionId}" found` : 'No decision with a decision table found',
      )
    }

    const table = this.firstByLocalName(decision, 'decisionTable')
    if (!table) {
      throw new Error('Selected decision has no decision table')
    }

    return this.builder.build({
      decisionId: this.attribute(decision, 'id'),
      decisionName: this.attribute(decision, 'name'),
      hitPolicy: this.attribute(table, 'hitPolicy'),
      aggregation: this.attribute(table, 'aggregation'),
      // Only the columns that belong to *this* table (skip nested inputData vars).
      inputs: this.byLocalName(table, 'input').map(input => {
        const expressionElement = this.firstByLocalName(input, 'inputExpression')
        return {
          id: this.attribute(input, 'id'),
          label: this.attribute(input, 'label'),
          expression: this.entryText(expressionElement),
          typeRef: this.attribute(expressionElement, 'typeRef'),
        }
      }),
      outputs: this.byLocalName(table, 'output').map(output => ({
        id: this.attribute(output, 'id'),
        name: this.attribute(output, 'name'),
        label: this.attribute(output, 'label'),
        typeRef: this.attribute(output, 'typeRef'),
        outputValues: this.entryText(this.firstByLocalName(output, 'outputValues')),
      })),
      rules: this.byLocalName(table, 'rule').map(rule => ({
        id: this.attribute(rule, 'id'),
        inputEntries: this.byLocalName(rule, 'inputEntry').map(entry => this.entryText(entry)),
        outputEntries: this.byLocalName(rule, 'outputEntry').map(entry => this.entryText(entry)),
      })),
    })
  }

  /** Namespace-agnostic lookup — DMN files use a default (prefix-less) namespace. */
  private byLocalName(scope: Element | Document, localName: string): Element[] {
    return Array.from(scope.getElementsByTagNameNS('*', localName))
  }

  private firstByLocalName(scope: Element | Document, localName: string): Element | null {
    return this.byLocalName(scope, localName)[0] ?? null
  }

  private attribute(element: Element | null, name: string): string {
    return element?.getAttribute(name) ?? ''
  }

  /** Text of the nested `<text>` element (used by input/output entries). */
  private entryText(entry: Element | null): string {
    if (!entry) return ''
    const text = this.firstByLocalName(entry, 'text')
    return (text?.textContent ?? '').trim()
  }
}
