/**
 * The single place a DMN typeRef is interpreted. Every other module asks for
 * its `DmnTypeKind` instead of matching typeRef spellings itself.
 */

export type DmnTypeKind = 'number' | 'boolean' | 'date' | 'time' | 'dateTime' | 'duration' | 'string'

const KIND_BY_TYPE_REF: Record<string, DmnTypeKind> = {
  integer: 'number',
  long: 'number',
  int: 'number',
  number: 'number',
  double: 'number',
  decimal: 'number',
  float: 'number',
  boolean: 'boolean',
  date: 'date',
  time: 'time',
  datetime: 'dateTime',
  'date and time': 'dateTime',
  duration: 'duration',
  daytimeduration: 'duration',
  yearmonthduration: 'duration',
}

export function classifyType(typeRef: string): DmnTypeKind {
  return KIND_BY_TYPE_REF[(typeRef || '').toLowerCase()] ?? 'string'
}

/** Whether a DMN typeRef should be edited as a number field. */
export function isNumericType(typeRef: string): boolean {
  return classifyType(typeRef) === 'number'
}
