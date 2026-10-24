/**
 * A minimal, empty DMN diagram: one decision holding a bare decision table with
 * a single input, output and rule — the smallest model you can meaningfully edit
 * from. Loading it lets the user model a diagram from scratch. The DMNDI shape
 * makes the decision appear in the DRD view, so the palette is usable straight
 * away.
 */
export const BLANK_DMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="Definitions_new" name="Neues Diagramm" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Neue Entscheidung">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1" label="Eingabe">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" label="Ausgabe" name="ausgabe" typeRef="string" />
      <rule id="Rule_1">
        <inputEntry id="InputEntry_1"><text></text></inputEntry>
        <outputEntry id="OutputEntry_1"><text></text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_1">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`
