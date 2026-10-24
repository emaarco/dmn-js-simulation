/**
 * Parse a DMN decision table from raw XML into the domain `DecisionModel`.
 *
 * This is the fallback adapter for consumers who have DMN XML but no live
 * dmn-js instance (and it powers the end-to-end unit tests). Inside a dmn-js
 * modeler, prefer `fromModdle.ts`, which reads the already-parsed businessObject
 * and needs no DOM. Only the parts a single decision table needs are extracted;
 * FEEL is never interpreted here (see `domain/evaluateDecision.ts`).
 */

import type { DecisionModel } from '../domain/model'
import { buildDecisionModel } from './buildDecisionModel'

/** Namespace-agnostic lookup — DMN files use a default (prefix-less) namespace. */
function byLocalName(scope: Element | Document, localName: string): Element[] {
  return Array.from(scope.getElementsByTagNameNS('*', localName))
}

function firstByLocalName(scope: Element | Document, localName: string): Element | null {
  return byLocalName(scope, localName)[0] ?? null
}

/** Text of the nested `<text>` element (used by input/output entries). */
function entryText(entry: Element | undefined): string {
  if (!entry) return ''
  const text = firstByLocalName(entry, 'text')
  return (text?.textContent ?? '').trim()
}

/**
 * Parse the first decision table (or the one matching `decisionId`) from a DMN
 * XML string.
 *
 * @throws if the XML is malformed or contains no decision table.
 */
export function parseDecisionModelFromXml(xml: string, decisionId?: string): DecisionModel {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (firstByLocalName(doc, 'parsererror')) {
    throw new Error('DMN XML could not be parsed')
  }

  const decisions = byLocalName(doc, 'decision')
  const decision = decisionId
    ? decisions.find(d => d.getAttribute('id') === decisionId)
    : decisions.find(d => firstByLocalName(d, 'decisionTable'))
  if (!decision) {
    throw new Error(
      decisionId ? `No decision with id "${decisionId}" found` : 'No decision with a decision table found',
    )
  }

  const table = firstByLocalName(decision, 'decisionTable')
  if (!table) {
    throw new Error('Selected decision has no decision table')
  }

  const attribute = (element: Element | null | undefined, name: string): string => element?.getAttribute(name) ?? ''
  return buildDecisionModel({
    decisionId: attribute(decision, 'id'),
    decisionName: attribute(decision, 'name'),
    hitPolicy: attribute(table, 'hitPolicy'),
    aggregation: attribute(table, 'aggregation'),
    // Only the columns that belong to *this* table (skip nested inputData vars).
    inputs: byLocalName(table, 'input').map(input => {
      const expressionEl = firstByLocalName(input, 'inputExpression')
      return {
        id: attribute(input, 'id'),
        label: attribute(input, 'label'),
        expression: entryText(expressionEl ?? undefined),
        typeRef: attribute(expressionEl, 'typeRef'),
      }
    }),
    outputs: byLocalName(table, 'output').map(output => ({
      id: attribute(output, 'id'),
      name: attribute(output, 'name'),
      label: attribute(output, 'label'),
      typeRef: attribute(output, 'typeRef'),
      outputValues: entryText(firstByLocalName(output, 'outputValues') ?? undefined),
    })),
    rules: byLocalName(table, 'rule').map(rule => ({
      id: attribute(rule, 'id'),
      inputEntries: byLocalName(rule, 'inputEntry').map(entryText),
      outputEntries: byLocalName(rule, 'outputEntry').map(entryText),
    })),
  })
}
