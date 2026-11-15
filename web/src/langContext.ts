import { createContext, useContext } from 'react'
import { translate, type Lang } from './i18n.ts'

export type LangState = { lang: Lang; setLang: (l: Lang) => void }
export const LangContext = createContext<LangState>({ lang: 'en', setLang: () => {} })

/** `t('English text', { placeholders })` in the current UI language. */
export function useT() {
  const { lang } = useContext(LangContext)
  return (en: string, vars?: Record<string, string | number>) => translate(lang, en, vars)
}
