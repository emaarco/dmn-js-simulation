/**
 * The demo page: wires the toolbar (examples, new, open, share), drag & drop and
 * the status / toast indicators to the editor.
 */

import { BLANK_DMN } from './blankDmn'
import type { Editor } from './Editor'
import type { HashAutosave } from './HashAutosave'
import type { ModelHash } from './ModelHash'

type Status = 'loading' | 'ready' | 'error'

export class ExampleApp {
  private readonly status = this.element<HTMLElement>('#status')
  private readonly picker = this.element<HTMLSelectElement>('#file-picker')
  private readonly canvas = this.element<HTMLElement>('#canvas')
  private readonly btnMenu = this.element<HTMLButtonElement>('#btn-menu')
  private readonly menu = this.element<HTMLElement>('#menu-dropdown')
  private readonly btnNew = this.element<HTMLButtonElement>('#btn-new')
  private readonly btnOpen = this.element<HTMLButtonElement>('#btn-open')
  private readonly btnShare = this.element<HTMLButtonElement>('#btn-share')
  private readonly btnReset = this.element<HTMLButtonElement>('#btn-reset')
  private readonly fileInput = this.element<HTMLInputElement>('#file-input')
  private readonly toast = this.element<HTMLElement>('#toast')
  private toastTimer: number | undefined

  constructor(
    private readonly editor: Editor,
    private readonly hash: ModelHash,
    private readonly autosave: HashAutosave,
  ) {}

  /** Wire the page, then load the model from the URL hash (a shared link or a reload) or the first example. */
  async start(): Promise<void> {
    this.editor.trackActiveView(this.canvas)
    this.autosave.start()
    this.bindMenu()
    this.bindImport()
    this.bindShare()

    const sharedXml = await this.hash.read()
    if (sharedXml) await this.applyXml(sharedXml)
    else await this.loadExample(this.picker.value)
  }

  /** Load DMN XML into the editor and mirror it into the URL hash. */
  private async applyXml(xml: string): Promise<void> {
    this.setStatus('loading')
    try {
      await this.editor.importAndOpen(xml)
      this.setStatus('ready')
      void this.hash.write(xml)
    } catch (err) {
      this.showError(err)
    }
  }

  /** Fetch one of the bundled example models and simulate it. */
  private async loadExample(path: string): Promise<void> {
    this.setStatus('loading')
    try {
      const url = new URL(path.replace(/^\//, ''), new URL(import.meta.env.BASE_URL, location.href)).href
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      await this.applyXml(await response.text())
    } catch (err) {
      this.showError(err)
    }
  }

  private bindMenu(): void {
    this.btnMenu.addEventListener('click', () => this.setMenuOpen(this.menu.hidden))

    document.addEventListener('click', event => {
      const target = event.target as Node
      if (!this.menu.hidden && !this.menu.contains(target) && !this.btnMenu.contains(target)) {
        this.setMenuOpen(false)
      }
    })
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.setMenuOpen(false)
    })

    this.picker.addEventListener('change', () => {
      this.setMenuOpen(false)
      void this.loadExample(this.picker.value)
    })

    this.btnReset.addEventListener('click', () => {
      this.picker.selectedIndex = 0
      this.setMenuOpen(false)
      void this.loadExample(this.picker.value)
    })

    this.btnNew.addEventListener('click', () => {
      this.setMenuOpen(false)
      this.picker.selectedIndex = -1
      void this.applyXml(BLANK_DMN)
    })
  }

  /** Import via the file dialog or drag & drop onto the canvas. */
  private bindImport(): void {
    this.btnOpen.addEventListener('click', () => this.fileInput.click())

    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0]
      this.setMenuOpen(false)
      if (file) void file.text().then(xml => this.applyXml(xml))
      // Allow re-selecting the same file later.
      this.fileInput.value = ''
    })

    this.canvas.addEventListener('dragover', event => {
      event.preventDefault()
      this.canvas.classList.add('is-dragover')
    })
    this.canvas.addEventListener('dragleave', () => this.canvas.classList.remove('is-dragover'))
    this.canvas.addEventListener('drop', event => {
      event.preventDefault()
      this.canvas.classList.remove('is-dragover')
      const file = event.dataTransfer?.files?.[0]
      if (file) void file.text().then(xml => this.applyXml(xml))
    })
  }

  /** The hash already mirrors the model, so sharing copies the current URL. */
  private bindShare(): void {
    this.btnShare.addEventListener('click', async () => {
      this.setMenuOpen(false)
      try {
        await this.hash.write(await this.editor.saveXml())
        await navigator.clipboard.writeText(location.href)
        this.showToast('Link in die Zwischenablage kopiert')
      } catch (err) {
        console.error(err)
        this.showToast('Teilen fehlgeschlagen')
      }
    })
  }

  private setMenuOpen(open: boolean): void {
    this.menu.hidden = !open
    this.btnMenu.setAttribute('aria-expanded', String(open))
  }

  private setStatus(state: Status, text: string = state): void {
    this.status.textContent = state === 'loading' ? 'loading…' : text
    this.status.dataset.state = state
  }

  private showError(err: unknown): void {
    this.setStatus('error', `error: ${err instanceof Error ? err.message : String(err)}`)
    console.error(err)
  }

  private showToast(message: string): void {
    this.toast.textContent = message
    this.toast.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => (this.toast.hidden = true), 2200)
  }

  private element<T extends HTMLElement>(selector: string): T {
    return document.querySelector<T>(selector)!
  }
}
