import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './style.css'

import { Editor } from './Editor'
import { ExampleApp } from './ExampleApp'
import { HashAutosave } from './HashAutosave'
import { ModelHash } from './ModelHash'

const editor = new Editor()
const hash = new ModelHash()

// Expose for E2E / debugging.
Object.assign(window as object, {
  __modeler: editor.modeler,
  __openDecisionTable: (decisionId: string) => editor.openDecisionTable(decisionId),
})

void new ExampleApp(editor, hash, new HashAutosave(editor, hash)).start()
