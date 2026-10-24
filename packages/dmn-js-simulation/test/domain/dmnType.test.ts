import { describe, it, expect } from 'vitest'
import { classifyType } from '../../src/domain/dmnType'

describe('classifyType', () => {
  it.each([
    ['integer', 'number'],
    ['Double', 'number'],
    ['boolean', 'boolean'],
    ['date', 'date'],
    ['time', 'time'],
    ['dateTime', 'dateTime'],
    ['date and time', 'dateTime'],
    ['dayTimeDuration', 'duration'],
    ['yearMonthDuration', 'duration'],
    ['string', 'string'],
    ['', 'string'],
    ['unknown', 'string'],
  ])('%s → %s', (typeRef, kind) => {
    expect(classifyType(typeRef)).toBe(kind)
  })
})
