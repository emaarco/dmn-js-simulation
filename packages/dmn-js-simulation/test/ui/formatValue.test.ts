import { describe, it, expect } from 'vitest'
import { formatValue } from '../../src/ui/formatValue'
import { coerceValue } from '../../src/domain/feel'

describe('formatValue', () => {
  it('renders primitives', () => {
    expect(formatValue('Spareribs')).toBe('Spareribs')
    expect(formatValue(42)).toBe('42')
    expect(formatValue(true)).toBe('true')
    expect(formatValue(10n)).toBe('10')
  })

  it('renders null/undefined and non-finite numbers as a dash', () => {
    expect(formatValue(null)).toBe('–')
    expect(formatValue(undefined)).toBe('–')
    expect(formatValue(NaN)).toBe('–')
    expect(formatValue(Infinity)).toBe('–')
  })

  it('renders Date and FEEL temporals as ISO', () => {
    expect(formatValue(new Date('2020-01-01T00:00:00Z'))).toBe('2020-01-01T00:00:00.000Z')
    expect(formatValue(coerceValue('2020-01-01', 'date'))).toBe('2020-01-01')
    expect(formatValue(coerceValue('2020-01-01T10:00:00', 'dateTime'))).toBe('2020-01-01T10:00:00')
    expect(formatValue(coerceValue('10:00:00', 'time'))).toBe('10:00:00')
    expect(formatValue(coerceValue('P4D', 'dayTimeDuration'))).toBe('P4D')
  })

  it('never throws on functions, symbols or circular objects', () => {
    expect(formatValue(() => 1)).toBe('–')
    expect(formatValue(Symbol('x'))).toBe('–')
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(formatValue(circular)).toBe('–')
  })

  it('renders plain objects/arrays as compact JSON', () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}')
    expect(formatValue([1, 2])).toBe('[1,2]')
  })
})
