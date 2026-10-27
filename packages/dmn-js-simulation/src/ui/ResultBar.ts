import { createElement } from 'inferno-create-element'
import { Component } from 'inferno'
import type { EvaluationResult } from '../domain/results'
import { formatValue } from './utils/formatValue'

export interface ResultBarProps {
  result: EvaluationResult
}

/** The result line — output pills, aggregation, violation and reported rules. */
export class ResultBar extends Component<ResultBarProps> {
  override render(): any {
    const { result } = this.props
    const miss = result.matchedRuleIndices.length === 0
    const className =
      'dmn-sim-result' + (miss ? ' dmn-sim-result--miss' : '') + (result.violation ? ' dmn-sim-result--warn' : '')

    return createElement(
      'div',
      { className },
      createElement('span', { className: 'dmn-sim-arrow' }, '→'),
      this.renderOutputs(result),
      result.violation ? createElement('span', { className: 'dmn-sim-violation' }, `⚠ ${result.violation}`) : null,
      this.renderReportedRules(result.reportedRuleIndices),
    )
  }

  private renderOutputs(result: EvaluationResult): any {
    if (result.aggregation) {
      return createElement(
        'span',
        { className: 'dmn-sim-output' },
        `${result.aggregation.fn}(${result.aggregation.output}) = `,
        createElement('strong', null, formatValue(result.aggregation.value)),
      )
    }
    if (!result.outputs.length) {
      return createElement('span', { className: 'dmn-sim-none' }, 'no matching rule')
    }
    return result.outputs.map((output, oi) =>
      createElement(
        'span',
        { className: 'dmn-sim-output', key: oi },
        Object.keys(output).map(key =>
          createElement('span', { key }, `${key} = `, createElement('strong', null, formatValue(output[key]))),
        ),
      ),
    )
  }

  private renderReportedRules(reportedRuleIndices: number[]): any {
    if (!reportedRuleIndices.length) return null
    const noun = reportedRuleIndices.length > 1 ? 'Rules' : 'Rule'
    return createElement(
      'span',
      { className: 'dmn-sim-rule' },
      `${noun} ${reportedRuleIndices.map(i => i + 1).join(', ')}`,
    )
  }
}
