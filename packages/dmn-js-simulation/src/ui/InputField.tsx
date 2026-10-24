/**
 * The control for one simulation input — dropdown, duration composer or native
 * field, as decided by `describeControl`. Both simulation surfaces (decision
 * table and DRD) render their inputs through it.
 */
import { createElement } from 'inferno-create-element'
import { Component } from 'inferno'
import type { RawValue } from '../domain/model'
import { composeDuration, DURATION_UNITS, type DurationUnit } from './utils/duration'
import { describeControl, durationParts, selectOptions, type ControlInput } from './utils/inputControl'

export interface InputFieldProps {
  input: ControlInput
  value: RawValue
  onChange: (value: string) => void
}

interface InputFieldState {
  /** The chosen duration unit, remembered while the amount is blank. */
  durationUnit?: DurationUnit
}

export class InputField extends Component<InputFieldProps, InputFieldState> {
  constructor(props: InputFieldProps, context: unknown) {
    super(props, context)
    this.state = {}
  }

  private readonly onValue = (event: Event) => {
    this.props.onChange((event.target as HTMLInputElement | HTMLSelectElement).value)
  }

  private readonly onDurationAmount = (event: Event) => {
    const amount = (event.target as HTMLInputElement).value
    const unit = this.durationUnit()
    this.setState({ durationUnit: unit })
    this.props.onChange(composeDuration(amount, unit))
  }

  private readonly onDurationUnit = (event: Event) => {
    const unit = (event.target as HTMLSelectElement).value as DurationUnit
    const { amount } = durationParts(this.props.value)
    this.setState({ durationUnit: unit })
    this.props.onChange(composeDuration(amount, unit))
  }

  private durationUnit(): DurationUnit {
    return this.state?.durationUnit ?? durationParts(this.props.value).unit
  }

  override render(): any {
    const { input, value } = this.props
    const spec = describeControl(input)

    if (spec.kind === 'select') {
      return createElement(
        'select',
        { className: 'dmn-sim-input', value: value ?? '', onChange: this.onValue },
        createElement('option', { value: '' }, '–'),
        selectOptions(spec.options, value).map(option =>
          createElement('option', { value: option, key: option }, option),
        ),
      )
    }

    if (spec.kind === 'duration') {
      const { amount, unit } = durationParts(value, this.durationUnit())
      return createElement(
        'span',
        { className: 'dmn-sim-duration' },
        createElement('input', {
          className: 'dmn-sim-input dmn-sim-duration-amount',
          type: 'number',
          min: '0',
          placeholder: 'amount',
          value: amount,
          onInput: this.onDurationAmount,
        }),
        createElement(
          'select',
          { className: 'dmn-sim-input dmn-sim-duration-unit', value: unit, onChange: this.onDurationUnit },
          DURATION_UNITS.map(u => createElement('option', { value: u.value, key: u.value }, u.label)),
        ),
      )
    }

    return createElement('input', {
      className: 'dmn-sim-input',
      type: spec.htmlType,
      placeholder: spec.placeholder,
      min: spec.min,
      max: spec.max,
      value: value ?? '',
      onInput: this.onValue,
    })
  }
}
