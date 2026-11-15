import { useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lang } from './i18n.ts'
import { LangContext, useT } from './langContext.ts'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

/** EN | TR switch; the active language uses the accent fill (same swap as a selected stop). */
export function LangSwitch() {
  const { lang, setLang } = useContext(LangContext)
  const t = useT()
  return (
    <div className="lang-switch" role="group" aria-label={t('Language')}>
      {(['en', 'tr'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
