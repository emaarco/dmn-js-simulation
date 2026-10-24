/**
 * Which form control an input gets and how its parts map to a raw value. Both
 * simulation surfaces (decision table and DRD) render from this spec, so the
 * rules live here once and the views stay free of type decisions.
 */
import { classifyType, type DmnTypeKind } from '../domain/dmnType'
import { DEFAULT_DURATION_UNIT, parseDuration, type DurationUnit } from './duration'

export interface ControlInput {
  typeRef: string
  options?: string[]
  min?: string
  max?: string
}

export type ControlSpec =
  | { kind: 'select'; options: string[] }
  | { kind: 'duration' }
  | { kind: 'native'; htmlType: string; placeholder: string; min?: string; max?: string }

const HTML_INPUT_TYPES: Partial<Record<DmnTypeKind, string>> = {
  number: 'number',
  date: 'date',
  dateTime: 'datetime-local',
  time: 'time',
}

export function describeControl(input: ControlInput): ControlSpec {
  if (input.options?.length) return { kind: 'select', options: input.options }
  const kind = classifyType(input.typeRef)
  if (kind === 'duration') return { kind: 'duration' }
  return {
    kind: 'native',
    htmlType: HTML_INPUT_TYPES[kind] ?? 'text',
    placeholder: input.typeRef,
    min: input.min,
    max: input.max,
  }
}

/** The select's options, plus a reflected value that isn't among them. */
export function selectOptions(options: string[], value: unknown): string[] {
  const v = value == null ? '' : String(value)
  return v !== '' && !options.includes(v) ? [v, ...options] : options
}

/** Split a raw duration value into the composer's amount and unit. */
export function durationParts(
  value: unknown,
  fallbackUnit: DurationUnit = DEFAULT_DURATION_UNIT,
): { amount: string; unit: DurationUnit } {
  const parsed = parseDuration(String(value ?? ''))
  return { amount: parsed?.amount ?? '', unit: parsed?.unit ?? fallbackUnit }
}
