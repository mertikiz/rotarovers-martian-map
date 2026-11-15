import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  computeRouteLegs,
  computeWalkSnapshot,
  findSteepIntervals,
  formatCardinal,
  marsBearingDeg,
  parseRouteGeoJSON,
  type RouteFeatureCollection,
} from '../src/walkUtils.ts'

const rawGeoJSON = JSON.parse(
  readFileSync(new URL('../public/data/route.geojson', import.meta.url), 'utf8'),
) as RouteFeatureCollection

const parsed = parseRouteGeoJSON(rawGeoJSON)

test('marsBearingDeg and formatCardinal compute expected compass headings', () => {
  // Due North
  const north = marsBearingDeg([137.2, -5.1], [137.2, -5.0])
  assert.ok(Math.abs(north - 0) < 0.01 || Math.abs(north - 360) < 0.01)
  assert.equal(formatCardinal(north), 'N')

  // Due East along near-equatorial parallel
  const east = marsBearingDeg([137.2, -5.0], [137.3, -5.0])
  assert.ok(Math.abs(east - 90) < 0.5)
  assert.equal(formatCardinal(east), 'E')

  // Due South
  const south = marsBearingDeg([137.2, -5.0], [137.2, -5.1])
  assert.ok(Math.abs(south - 180) < 0.01)
  assert.equal(formatCardinal(south), 'S')

  // Due West
  const west = marsBearingDeg([137.3, -5.0], [137.2, -5.0])
  assert.ok(Math.abs(west - 270) < 0.5)
  assert.equal(formatCardinal(west), 'W')
})

test('computeWalkSnapshot computes local slope, ahead 50m slope, and cumulative climb/descent from DTM elevations', () => {
  const startSnap = computeWalkSnapshot(parsed, 0)
  assert.equal(startSnap.walkedClimbM, 0)
  assert.equal(startSnap.walkedDescentM, 0)
  assert.ok(
    typeof startSnap.currentSlopeDeg === 'number' &&
      Math.abs(startSnap.currentSlopeDeg) <= (parsed.slopeLimitDeg ?? 20),
    `local slope ${startSnap.currentSlopeDeg} should be within walkable limit`,
  )
  assert.ok(
    typeof startSnap.maxSlopeAhead50mDeg === 'number' &&
      startSnap.maxSlopeAhead50mDeg >= 0 &&
      startSnap.maxSlopeAhead50mDeg <= (parsed.slopeLimitDeg ?? 20),
    `maxSlopeAhead50mDeg ${startSnap.maxSlopeAhead50mDeg} should be within walkable limit`,
  )

  const endSnap = computeWalkSnapshot(parsed, parsed.coordinates.length - 1)
  if (parsed.climbM !== undefined && parsed.descentM !== undefined) {
    assert.ok(
      Math.abs((endSnap.walkedClimbM ?? 0) - parsed.climbM) < 1.0,
      `end walkedClimbM ${endSnap.walkedClimbM} vs route climb_m ${parsed.climbM}`,
    )
    assert.ok(
      Math.abs((endSnap.walkedDescentM ?? 0) - parsed.descentM) < 1.0,
      `end walkedDescentM ${endSnap.walkedDescentM} vs route descent_m ${parsed.descentM}`,
    )
  }
})

test('computeRouteLegs partitions the round-trip route into contiguous stop-to-stop legs plus return leg', () => {
  const legs = computeRouteLegs(parsed)
  // 5 stops => 4 outbound legs + 1 return leg to Base = 5 legs total
  assert.equal(legs.length, parsed.stops.length)
  assert.equal(legs[legs.length - 1].isReturnLeg, true)

  let sumLengthM = 0
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i]
    assert.ok(leg.lengthM > 0, `leg ${leg.legNumber} must have positive length`)
    assert.ok(
      leg.maxSlopeDeg <= (parsed.slopeLimitDeg ?? 20),
      `leg ${leg.legNumber} maxSlopeDeg ${leg.maxSlopeDeg} exceeds limit`,
    )
    sumLengthM += leg.lengthM
    if (i > 0) {
      assert.equal(leg.startIndex, legs[i - 1].endIndex)
    }
  }

  assert.ok(
    Math.abs(sumLengthM - parsed.totalDistanceM) < 1e-6,
    `sum of leg lengths ${sumLengthM} m vs totalDistanceM ${parsed.totalDistanceM} m`,
  )
})

test('findSteepIntervals identifies caution intervals below the 20 deg limit', () => {
  const steep15 = findSteepIntervals(parsed, 15)
  for (const band of steep15) {
    assert.ok(band.peakSlopeDeg >= 15)
    assert.ok(band.peakSlopeDeg <= (parsed.slopeLimitDeg ?? 20))
    assert.ok(band.endDistanceM > band.startDistanceM)
  }
})

