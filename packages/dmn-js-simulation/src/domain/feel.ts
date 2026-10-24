/**
 * Thin adapter around the `feelin` FEEL engine — the single place that imports
 * `feelin`. Isolates value coercion and the two FEEL operations a decision table
 * needs (unary tests for input cells, expressions for output cells) so the rest
 * of the code never touches the engine directly.
 */

import { unaryTest, evaluate, FeelDate, FeelDateTime, FeelDuration, FeelTime } from 'feelin'
import { classifyType, type DmnTypeKind } from './dmnType'

/** A raw form value before it is coerced to its DMN type. */
export type RawValue = string | number | boolean | null | undefined

/** Temporal type kinds → the FEEL constructor that parses their literal form. */
const TEMPORAL_CONSTRUCTORS: Partial<Record<DmnTypeKind, string>> = {
  date: 'date',
  time: 'time',
  dateTime: 'date and time',
  duration: 'duration',
}

/** Coerce a raw form value into the JS type its DMN typeRef implies. */
export function coerceValue(raw: RawValue, typeRef: string): unknown {
  if (raw === undefined || raw === null) return undefined
  // Treat a blank / whitespace-only string as "missing" (Number('  ') is 0).
  if (typeof raw === 'string' && raw.trim() === '') return undefined

  const kind = classifyType(typeRef)
  if (kind === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? undefined : n
  }
  if (kind === 'boolean') {
    return raw === true || raw === 'true'
  }
  const constructor = TEMPORAL_CONSTRUCTORS[kind]
  if (constructor) {
    // Parse the raw literal into a real FEEL temporal via its constructor so
    // temporal unary tests (e.g. `< date("2020-01-01")`) compare like-typed
    // values; `?` is then bound to the parsed temporal, not the raw string.
    const parsed = evaluateExpression(`${constructor}(value)`, { value: String(raw) })
    return parsed ?? undefined
  }
  return String(raw)
}

/**
 * Evaluate a FEEL unary test against a value (bound to `?`).
 * Returns false on any parse/evaluation error rather than throwing.
 */
export function evaluateUnaryTest(text: string, value: unknown): boolean {
  try {
    return unaryTest(text, { '?': value }).value === true
  } catch {
    return false
  }
}

/**
 * Evaluate a FEEL expression against a context.
 * Returns null on any parse/evaluation error rather than throwing.
 */
export function evaluateExpression(text: string, context: Record<string, unknown>): unknown {
  try {
    return evaluate(text, context).value
  } catch {
    return null
  }
}

/** The ISO 8601 form of a FEEL temporal (date, time, date and time, duration), or null for any other value. */
export function temporalToIso(value: unknown): string | null {
  const isTemporal =
    value instanceof FeelDate ||
    value instanceof FeelDateTime ||
    value instanceof FeelTime ||
    value instanceof FeelDuration
  return isTemporal ? value.toString() : null
}
