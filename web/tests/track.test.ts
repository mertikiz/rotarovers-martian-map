// Route display: smoothing and stop icons. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_STOP_ICON, smoothLine, stopIcon, withAlpha } from '../src/track.ts'

test('smoothing keeps both ends and stays within a quarter segment of the original', () => {
  const stairs = [[0, 0], [5, 0], [5, 5], [10, 5], [10, 10]]
  const s = smoothLine(stairs)
  assert.deepEqual(s[0], [0, 0])
  assert.deepEqual(s[s.length - 1], [10, 10])
  const nearest = (p: number[]) =>
    Math.min(...stairs.slice(1).map((b, i) => {
      const a = stairs[i]
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / 25))
      return Math.hypot(p[0] - (a[0] + t * (b[0] - a[0])), p[1] - (a[1] + t * (b[1] - a[1])))
    }))
  for (const p of s) assert.ok(nearest(p) <= 1.25 + 1e-9, `${p} is too far from the route`)
})

test('every science stop in the route data has its own icon', () => {
  const route = JSON.parse(readFileSync(new URL('../public/data/route.geojson', import.meta.url), 'utf8'))
  const stops = route.features.filter((f: { properties: { role: string } }) => f.properties.role === 'stop')
  const icons = stops.map((f: { properties: { name: string } }) => stopIcon(f.properties.name))
  assert.ok(icons.every((i: string) => i !== DEFAULT_STOP_ICON))
  assert.equal(new Set(icons).size, icons.length)
})

test('accent colours get a soft transparent version for the glow', () => {
  assert.equal(withAlpha('#0891b2', 0.2), 'rgba(8, 145, 178, 0.2)')
})
