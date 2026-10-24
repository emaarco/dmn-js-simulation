import { describe, it, expect } from 'vitest'
import { describeControl, durationParts, selectOptions } from '../../src/ui/inputControl'

describe('describeControl', () => {
  it('offers a select when the input has options', () => {
    expect(describeControl({ typeRef: 'string', options: ['a', 'b'] })).toEqual({
      kind: 'select',
      options: ['a', 'b'],
    })
  })

  it('offers the duration composer for duration types', () => {
    expect(describeControl({ typeRef: 'dayTimeDuration' })).toEqual({ kind: 'duration' })
  })

  it.each([
    ['integer', 'number'],
    ['double', 'number'],
    ['date', 'date'],
    ['dateTime', 'datetime-local'],
    ['time', 'time'],
    ['string', 'text'],
    ['', 'text'],
  ])('maps %s to a native %s input', (typeRef, htmlType) => {
    expect(describeControl({ typeRef })).toMatchObject({ kind: 'native', htmlType, placeholder: typeRef })
  })

  it('carries bounds onto the native input', () => {
    expect(describeControl({ typeRef: 'integer', min: '1', max: '9' })).toMatchObject({ min: '1', max: '9' })
  })
})

describe('selectOptions', () => {
  it('prepends a reflected value that is not an option', () => {
    expect(selectOptions(['a', 'b'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('keeps the options for a known or empty value', () => {
    expect(selectOptions(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(selectOptions(['a', 'b'], null)).toEqual(['a', 'b'])
  })
})

describe('durationParts', () => {
  it('splits a single-unit duration', () => {
    expect(durationParts('PT3H')).toEqual({ amount: '3', unit: 'H' })
  })

  it('falls back to the given unit for a blank value', () => {
    expect(durationParts('', 'Y')).toEqual({ amount: '', unit: 'Y' })
    expect(durationParts(undefined)).toEqual({ amount: '', unit: 'D' })
  })
})
