import { useEffect, useState, type ReactNode } from 'react'
import {
  applyTheme,
  DARK_QUERY,
  readThemePref,
  resolveTheme,
  saveThemePref,
  systemIsDark,
  THEME_PREFS,
  type ThemePref,
} from './theme.ts'
import { ThemeContext, useTheme } from './themeContext.ts'
import { useT } from './langContext.ts'

/** Holds the theme choice. The <html data-theme> attribute is written before state changes, so anything that
 *  reads CSS colours on the new theme (the map markers) already sees the new values. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readThemePref)
  const [systemDark, setSystemDark] = useState(systemIsDark)
  const theme = resolveTheme(pref, systemDark)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(DARK_QUERY)
    const onChange = () => {
      applyTheme(resolveTheme(readThemePref(), mq.matches))
      setSystemDark(mq.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setPref = (p: ThemePref) => {
    applyTheme(resolveTheme(p, systemDark))
    saveThemePref(p)
    setPrefState(p)
  }

  return <ThemeContext.Provider value={{ pref, theme, setPref }}>{children}</ThemeContext.Provider>
}

const LABELS: Record<ThemePref, string> = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' }

function Icon({ pref }: { pref: ThemePref }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', 'aria-hidden': true } as const
  if (pref === 'light')
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  if (pref === 'dark')
    return (
      <svg {...common} fill="currentColor">
        <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" />
      </svg>
    )
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Light | dark | system, as icons; the active one takes the accent fill (same swap as EN | TR). */
export function ThemeSwitch() {
  const { pref, setPref } = useTheme()
  const t = useT()
  return (
    <div className="seg seg--icons" role="group" aria-label={t('Theme')}>
      {THEME_PREFS.map((p) => (
        <button key={p} type="button" aria-pressed={pref === p} title={t(LABELS[p])} aria-label={t(LABELS[p])}
          onClick={() => setPref(p)}>
          <Icon pref={p} />
        </button>
      ))}
    </div>
  )
}
