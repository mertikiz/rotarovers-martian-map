import { useState } from 'react'
import MapView, { type Mode } from './MapView.tsx'
import ConditionsPanel from './ConditionsPanel.tsx'
import WalkView from './WalkView.tsx'
import type { LonLat } from './geo.ts'
import { LangProvider } from './Lang.tsx'
import { ThemeProvider } from './Theme.tsx'

function App() {
  // The walk view's simulated astronaut position, drawn on the map in Walk mode.
  const [walker, setWalker] = useState<LonLat | null>(null)
  const [mode, setMode] = useState<Mode>('plan')
  return (
    <LangProvider>
      <ThemeProvider>
        <main className="app">
          <MapView
            walker={mode === 'walk' ? walker : null}
            mode={mode}
            onModeChange={setMode}
            planExtra={<ConditionsPanel />}
            walkPanel={<WalkView onPositionChange={setWalker} />}
          />
        </main>
      </ThemeProvider>
    </LangProvider>
  )
}

export default App
