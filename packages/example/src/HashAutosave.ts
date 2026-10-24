/**
 * Reload survival: keep the URL hash in sync with the model so an (accidental)
 * reload reopens the user's work instead of resetting.
 */

import type { Editor } from './Editor'
import type { ModelHash } from './ModelHash'

const DEBOUNCE_MS = 400

export class HashAutosave {
  private pendingSync: number | undefined

  constructor(
    private readonly editor: Editor,
    private readonly hash: ModelHash,
  ) {}

  /** Start mirroring edits (debounced) into the URL hash. */
  start(): void {
    this.editor.onModelEdited(() => this.scheduleSync())

    // Flush a pending edit before the tab is hidden, so a quick reload keeps it.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendingSync !== undefined) void this.syncNow()
    })
  }

  /** Write the current model into the hash right away. */
  async syncNow(): Promise<void> {
    window.clearTimeout(this.pendingSync)
    this.pendingSync = undefined
    try {
      await this.hash.write(await this.editor.saveXml())
    } catch (err) {
      console.error(err)
    }
  }

  private scheduleSync(): void {
    window.clearTimeout(this.pendingSync)
    this.pendingSync = window.setTimeout(() => void this.syncNow(), DEBOUNCE_MS)
  }
}
