/**
 * The `#dmn=` link encoding: DMN XML compressed with `deflate-raw` (browser-native
 * — no CDN, GDPR-friendly) and stored as URL-safe Base64.
 */

/** Bytes → URL-safe Base64 (A–Z a–z 0–9 - _, no padding). */
function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): Uint8Array {
  let norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = norm.length % 4
  if (pad) norm += '='.repeat(4 - pad)
  const bin = atob(norm)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(piped).arrayBuffer())
}

/** DMN XML → compressed, URL-safe Base64. */
export async function encodeXml(xml: string): Promise<string> {
  const deflated = await pipe(new TextEncoder().encode(xml), new CompressionStream('deflate-raw'))
  return toBase64Url(deflated)
}

/** Compressed, URL-safe Base64 → DMN XML. */
export async function decodeXml(encoded: string): Promise<string> {
  const inflated = await pipe(fromBase64Url(encoded), new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(inflated)
}
