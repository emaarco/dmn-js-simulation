/**
 * The simulation UI rendered above a dmn-js decision table: an input form (one
 * control per table input), Simulate / Reset actions, and a result bar showing
 * the hit-policy outcome. It is an Inferno component so dmn-js renders it into
 * its own component tree via the `table.before` slot.
 *
 * The component is a thin view over `SimulationStore`: it reads the model /
 * values / result and calls back into the store. Row highlighting is a separate
 * concern handled by the integration layer, which also subscribes to the store.
 */
import { createElement } from 'inferno-create-element'
import { Component } from 'inferno'
import type { SimulationStore } from '../simulation/SimulationStore'
import { InputField } from './InputField'
import { ResultBar } from './ResultBar'

export class SimulationForm extends Component<Record<string, never>, { tick: number }> {
  private readonly store: SimulationStore
  private unsubscribe?: () => void

  constructor(props: Record<string, never>, context: any) {
    super(props, context)
    this.store = context.injector.get('simulationStore')
    this.state = { tick: 0 }
  }

  override componentWillMount(): void {
    this.unsubscribe = this.store.subscribe(() => this.setState({ tick: this.state!.tick + 1 }))
  }

  override componentWillUnmount(): void {
    this.unsubscribe?.()
  }

  private readonly onSubmit = (event: Event) => {
    event.preventDefault()
    this.store.run()
  }

  private readonly onRun = () => this.store.run()

  private readonly onReset = () => this.store.reset()

  override render(): any {
    const model = this.store.getModel()
    if (!model) return null

    const values = this.store.getValues()
    const result = this.store.getResult()

    return createElement(
      'div',
      { className: 'dmn-sim' },
      createElement(
        'form',
        { className: 'dmn-sim-inputs', onSubmit: this.onSubmit },
        model.inputs.map((input, i) =>
          createElement(
            'label',
            { className: 'dmn-sim-field', key: input.id },
            createElement('span', { className: 'dmn-sim-field-label' }, input.label),
            createElement(InputField, {
              input,
              value: values[i],
              onChange: (value: string) => this.store.setValue(i, value),
            }),
          ),
        ),
        createElement(
          'button',
          {
            // A plain button, not a submit: native min/max guidance must never
            // block running the simulation (e.g. an out-of-range value → a miss).
            type: 'button',
            className: 'dmn-sim-run',
            title: 'Run the simulation',
            onClick: this.onRun,
          },
          'Simulate',
        ),
        createElement('button', { type: 'button', className: 'dmn-sim-reset', onClick: this.onReset }, 'Reset'),
      ),
      result ? createElement(ResultBar, { result }) : null,
    )
  }
}
