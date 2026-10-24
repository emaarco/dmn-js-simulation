// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { createElement } from 'inferno-create-element'
import { render } from 'inferno'
import { InputField, type InputFieldProps } from '../../src/ui/InputField'

/** Mounts the field like a parent form does: every reported value is rendered back as the new `value`. */
function mount(props: InputFieldProps): HTMLElement {
  const container = document.body.appendChild(document.createElement('div'))
  const renderWith = (value: InputFieldProps['value']): void => {
    const onChange = (next: string): void => {
      props.onChange(next)
      renderWith(next)
    }
    render(createElement(InputField, { ...props, value, onChange }), container)
  }
  renderWith(props.value)
  return container
}

function enter(element: HTMLInputElement | HTMLSelectElement, value: string, eventType: 'input' | 'change'): void {
  element.value = value
  element.dispatchEvent(new Event(eventType, { bubbles: true }))
}

describe('InputField', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a native field for the typeRef and reports typed values', () => {
    const onChange = vi.fn()
    const container = mount({ input: { typeRef: 'integer', min: '1', max: '9' }, value: '', onChange })
    const field = container.querySelector('input')!

    expect(field.type).toBe('number')
    expect(field.min).toBe('1')
    enter(field, '5', 'input')
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('offers a reflected value that is not among the column options', () => {
    const container = mount({ input: { typeRef: 'string', options: ['Fall'] }, value: 'Spring', onChange: vi.fn() })
    const options = Array.from(container.querySelectorAll('option')).map(option => option.value)
    expect(options).toEqual(['', 'Spring', 'Fall'])
  })

  it('composes an ISO duration from amount and unit', () => {
    const onChange = vi.fn()
    const container = mount({ input: { typeRef: 'duration' }, value: '', onChange })
    const amount = container.querySelector<HTMLInputElement>('.dmn-sim-duration-amount')!
    const unit = container.querySelector<HTMLSelectElement>('.dmn-sim-duration-unit')!

    enter(amount, '3', 'input')
    expect(onChange).toHaveBeenLastCalledWith('P3D')

    enter(unit, 'H', 'change')
    expect(onChange).toHaveBeenLastCalledWith('PT3H')

    enter(amount, '', 'input')
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(unit.value).toBe('H')

    enter(amount, '2', 'input')
    expect(onChange).toHaveBeenLastCalledWith('PT2H')
  })
})
