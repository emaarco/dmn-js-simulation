/**
 * Pick the HTML `<input type>` best suited to a DMN typeRef, so the form offers
 * a native picker where the browser has one. The value each native control emits
 * (an ISO string) is exactly what `coerceValue` parses via the FEEL temporal
 * constructors, so nothing downstream has to change.
 */
import { classifyType, type DmnTypeKind } from '../domain/dmnType'

const HTML_INPUT_TYPES: Partial<Record<DmnTypeKind, string>> = {
  number: 'number',
  date: 'date',
  dateTime: 'datetime-local',
  time: 'time',
}

export function htmlInputType(typeRef: string): string {
  return HTML_INPUT_TYPES[classifyType(typeRef)] ?? 'text'
}
