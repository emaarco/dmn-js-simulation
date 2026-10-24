/**
 * Distro smoke test: import the *built* bundle (both ESM and CJS) and assert the
 * public API is present. Guards against a broken build / exports map even when
 * the source tests are green. Run after `npm run build`.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const expected = [
  'DecisionTableEvaluator',
  'DecisionRequirementsDiagramEvaluator',
  'HitPolicyResolver',
  'DmnXmlReader',
  'DmnModdleReader',
  'SimulationStore',
  'ModelerBridge',
  'coerceValue',
  'evaluateUnaryTest',
  'evaluateExpression',
  'isNumericType',
]

const esm = await import('../../dist/index.js')
const cjs = require('../../dist/index.cjs')

for (const name of expected) {
  assert.equal(typeof esm[name], 'function', `ESM bundle is missing export "${name}"`)
  assert.equal(typeof cjs[name], 'function', `CJS bundle is missing export "${name}"`)
}

// The default export exposes the dmn-js modules with the expected didi shape.
for (const [label, mod] of [
  ['ESM', esm.default],
  ['CJS', cjs.default],
]) {
  assert.ok(mod && mod.decisionTable, `${label} default export is missing .decisionTable module`)
  assert.ok(mod.decisionRequirementsDiagram, `${label} default export is missing .decisionRequirementsDiagram module`)
  const table = mod.decisionTable
  assert.ok(Array.isArray(table.__init__), `${label} decisionTable module has no __init__`)
  assert.ok(Array.isArray(table.dmnSimulationTable), `${label} decisionTable module has no service entry`)
  assert.ok(
    Array.isArray(mod.decisionRequirementsDiagram.dmnSimulationDecisionRequirementsDiagram),
    `${label} decisionRequirementsDiagram module has no service entry`,
  )
}

console.log(`distro smoke ok — core + store + didi modules present in ESM + CJS`)
