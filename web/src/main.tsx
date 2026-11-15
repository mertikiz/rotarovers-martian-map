import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, readThemePref, resolveTheme, systemIsDark } from './theme.ts'

// Set the theme before the first paint, so a remembered choice does not flash the other theme.
applyTheme(resolveTheme(readThemePref(), systemIsDark()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
