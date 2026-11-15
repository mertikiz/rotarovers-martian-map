/** Colour theme: the user picks light, dark or system (the default); the choice is remembered in this browser.
 *  The resolved theme is written to <html data-theme="light|dark">, which is what the CSS tokens key on. */
export type ThemePref = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export const THEME_PREFS: readonly ThemePref[] = ['light', 'dark', 'system']
const STORAGE_KEY = 'rotarovers-theme'

export function isThemePref(v: unknown): v is ThemePref {
  return typeof v === 'string' && (THEME_PREFS as readonly string[]).includes(v)
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}

/** Storage can be missing or blocked (private window, previews): fall back to the system theme. */
export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isThemePref(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // not remembered; the choice still applies for this visit
  }
}

export const DARK_QUERY = '(prefers-color-scheme: dark)'

export function systemIsDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
