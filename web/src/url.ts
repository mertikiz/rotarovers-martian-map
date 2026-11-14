/** Fetch JSON from the site's own data folder; a missing file (e.g. a 404 page) becomes a clear error,
 *  not a JSON parse error. */
export async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return (await r.json()) as T
}

/** The URL if it is an http(s) link, else null. Stop sources come from a hand-edited CSV, so a
 * javascript: or data: value must never reach an href. */
export function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}
