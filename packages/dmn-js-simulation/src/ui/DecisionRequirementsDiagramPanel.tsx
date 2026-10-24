/**
 * The input panel of the DRD simulation: one control per InputData leaf plus
 * Simulate / Reset. A thin view over `DecisionRequirementsDiagramStore`; the
 * fired-decision markers on the canvas are drawn by the integration layer.
 */
import { createElement } from 'inferno-create-element'
import { Component } from 'inferno'
import type { DecisionRequirementsDiagramStore } from '../simulation/DecisionRequirementsDiagramStore'
import { InputField } from './InputField'

export interface DecisionRequirementsDiagramPanelProps {
  store: DecisionRequirementsDiagramStore
}

export class DecisionRequirementsDiagramPanel extends Component<
  DecisionRequirementsDiagramPanelProps,
  { tick: number }
> {
  private unsubscribe?: () => void

  constructor(props: DecisionRequirementsDiagramPanelProps, context: unknown) {
    super(props, context)
    this.state = { tick: 0 }
  }

  override componentWillMount(): void {
    this.unsubscribe = this.props.store.subscribe(() => this.setState({ tick: this.state!.tick + 1 }))
  }

  override componentWillUnmount(): void {
    this.unsubscribe?.()
  }

  private readonly onRun = () => this.props.store.run()

  private readonly onReset = () => this.props.store.reset()

  override render(): any {
    const { store } = this.props
    const model = store.getModel()
    if (!model) return null
    const values = store.getValues()

    return createElement(
      'div',
      { className: 'dmn-sim-decision-requirements-diagram-panel' },
      createElement('div', { className: 'dmn-sim-decision-requirements-diagram-title' }, 'Simulate DRD'),
      createElement(
        'div',
        { className: 'dmn-sim-decision-requirements-diagram-fields' },
        model.inputData.map(input =>
          createElement(
            'div',
            { className: 'dmn-sim-field', key: input.id },
            createElement('span', { className: 'dmn-sim-field-label' }, input.label),
            createElement(InputField, {
              input,
              value: values[input.id],
              onChange: (value: string) => store.setValue(input.id, value),
            }),
          ),
        ),
      ),
      createElement(
        'div',
        { className: 'dmn-sim-decision-requirements-diagram-actions' },
        createElement('button', { type: 'button', className: 'dmn-sim-run', onClick: this.onRun }, 'Simulate'),
        createElement('button', { type: 'button', className: 'dmn-sim-reset', onClick: this.onReset }, 'Reset'),
      ),
    )
  }
}
