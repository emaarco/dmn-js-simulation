/**
 * The model lives in the URL hash (`#dmn=`), so a shared link opens the exact
 * model and an (accidental) reload reopens the user's work.
 */

import { decodeXml, encodeXml } from './utils/shareEncoding'

const HASH_PREFIX = '#dmn='

export class ModelHash {
  /** The DMN XML encoded in the current URL hash, or null if there is none. */
  async read(): Promise<string | null> {
    const hash = location.hash
    if (!hash.startsWith(HASH_PREFIX)) return null
    try {
      return await decodeXml(hash.slice(HASH_PREFIX.length))
    } catch {
      return null
    }
  }

  /** Mirror the given model into the URL hash, without adding a history entry. */
  async write(xml: string): Promise<void> {
    try {
      history.replaceState(null, '', `${HASH_PREFIX}${await encodeXml(xml)}`)
    } catch (err) {
      console.error(err)
    }
  }
}
