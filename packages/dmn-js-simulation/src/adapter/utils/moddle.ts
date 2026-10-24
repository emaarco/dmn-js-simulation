/**
 * The minimal structural view of a dmn-moddle businessObject that the readers
 * use; the full dmn-moddle type surface is intentionally not depended on.
 */

export interface ModdleElement {
  $type: string
  $parent?: ModdleElement
  id?: string
  name?: string
  [key: string]: unknown
}

export function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function elementsOf(value: unknown): ModdleElement[] {
  return Array.isArray(value) ? (value as ModdleElement[]) : []
}

/** Text of an entry element (`inputEntry` / `outputEntry` / `inputExpression`). */
export function entryText(entry: ModdleElement | undefined): string {
  return stringOf(entry?.text).trim()
}

/** Resolve a moddle reference (`requiredDecision` / `requiredInput`) to an id. */
export function referencedId(ref: unknown): string {
  if (!ref || typeof ref !== 'object') return ''
  const element = ref as ModdleElement
  if (element.id) return stringOf(element.id)
  const href = stringOf(element.href)
  return href.startsWith('#') ? href.slice(1) : href
}
