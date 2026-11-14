// Python and web must agree on the route length (both on the Mars sphere). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MARS_RADIUS_M, routeLengthM, type LonLat } from '../src/geo.ts'

const route = JSON.parse(readFileSync(new URL('../public/data/route.geojson', import.meta.url), 'utf8'))
const line = route.features.find((f: { properties: { role: string } }) => f.properties.role === 'route')

test('web route length matches the pipeline length_m', () => {
  const web = routeLengthM(line.geometry.coordinates as LonLat[])
  assert.ok(Math.abs(web - line.properties.length_m) < 0.5, `web ${web} m vs pipeline ${line.properties.length_m} m`)
})

test('uses the Mars radius, not the Earth default', () => {
  assert.equal(MARS_RADIUS_M, 3396190)
  // 1 degree of latitude on Mars is about 59.27 km (Earth: 111.2 km)
  const oneDegree = routeLengthM([[137.2, -5], [137.2, -4]])
  assert.ok(Math.abs(oneDegree - 59274) < 5, `${oneDegree}`)
})
