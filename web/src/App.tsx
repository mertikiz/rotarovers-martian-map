import { useState } from 'react'
import MapView from './MapView.tsx'
import WalkView from './WalkView.tsx'
import type { LonLat } from './geo.ts'

function App() {
  // The walk view's simulated astronaut position, also drawn on the map.
  const [walker, setWalker] = useState<LonLat | null>(null)
  return (
    <main className="app">
      <MapView walker={walker} />
      <WalkView onPositionChange={setWalker} />
    </main>
  )
}

export default App
