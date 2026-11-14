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
