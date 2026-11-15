import { useState } from 'react'
import MapView from './MapView.tsx'
import ConditionsPanel from './ConditionsPanel.tsx'
import WalkView from './WalkView.tsx'
import type { LonLat } from './geo.ts'
import { LangProvider } from './Lang.tsx'

function App() {
  // The walk view's simulated astronaut position, also drawn on the map.
  const [walker, setWalker] = useState<LonLat | null>(null)
  return (
    <LangProvider>
      <main className="app">
        <MapView walker={walker} />
        <ConditionsPanel />
        <WalkView onPositionChange={setWalker} />
      </main>
    </LangProvider>
  )
}

export default App
