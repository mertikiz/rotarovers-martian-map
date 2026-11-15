import { createContext, useContext } from 'react'
import type { Theme, ThemePref } from './theme.ts'

export type ThemeState = { pref: ThemePref; theme: Theme; setPref: (p: ThemePref) => void }
export const ThemeContext = createContext<ThemeState>({ pref: 'system', theme: 'light', setPref: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}
