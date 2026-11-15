// The map's on/off layer switches. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LAYERS, ALL_LAYERS_ON, setLayer } from '../src/layerToggles.ts'

test('every map layer starts switched on', () => {
  for (const l of MAP_LAYERS) assert.equal(ALL_LAYERS_ON[l.key], true, l.key)
})

test('switching one layer leaves the others alone and does not mutate the old state', () => {
  const next = setLayer(ALL_LAYERS_ON, 'slope', false)
  assert.equal(next.slope, false)
  assert.equal(next.terrain, true)
  assert.equal(next.route, true)
  assert.equal(ALL_LAYERS_ON.slope, true)
})

test('layer keys and labels are unique', () => {
  assert.equal(new Set(MAP_LAYERS.map((l) => l.key)).size, MAP_LAYERS.length)
  assert.equal(new Set(MAP_LAYERS.map((l) => l.label)).size, MAP_LAYERS.length)
})
