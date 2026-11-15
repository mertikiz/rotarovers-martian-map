import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  computeWalkSnapshot,
  DEFAULT_WALK_SPEED_KMH,
  DEFAULT_WALK_SPEED_MPS,
  parseRouteGeoJSON,
  type RouteFeatureCollection,
} from '../src/walkUtils.ts'

const rawGeoJSON = JSON.parse(
  readFileSync(new URL('../public/data/route.geojson', import.meta.url), 'utf8'),
) as RouteFeatureCollection

const parsed = parseRouteGeoJSON(rawGeoJSON)

test('round-trip route has its turnaround point right at the final stop', () => {
  assert.equal(parsed.isRoundTrip, true)
  assert.ok(parsed.stops.length >= 2, 'expected at least 2 stops')

  const lastStop = parsed.stops[parsed.stops.length - 1]
  const midIndex = (parsed.coordinates.length - 1) / 2

  assert.equal(lastStop.routeIndex, midIndex, 'last stop should sit at the midpoint vertex')

  const atTurnaround = computeWalkSnapshot(parsed, lastStop.routeIndex)
  assert.equal(atTurnaround.isAtTurnaround, true)
  assert.equal(atTurnaround.isPastTurnaround, false)
  assert.equal(atTurnaround.currentStop?.order, lastStop.order)
  assert.ok(
    Math.abs(atTurnaround.turnaroundDistanceM - lastStop.distanceAlongRouteM) < 1e-6,
    `turnaround ${atTurnaround.turnaroundDistanceM} m vs last stop ${lastStop.distanceAlongRouteM} m`,
  )
})

test('on the return leg there is no next stop and remaining distance is accurate', () => {
  const lastStop = parsed.stops[parsed.stops.length - 1]
  const maxIndex = parsed.coordinates.length - 1
  const returnIndices = [
    lastStop.routeIndex + 1,
    Math.floor((lastStop.routeIndex + maxIndex) / 2),
    maxIndex,
  ]

  for (const idx of returnIndices) {
    const snap = computeWalkSnapshot(parsed, idx)
    assert.equal(snap.isPastTurnaround, true, `expected index ${idx} to be past turnaround`)
    assert.equal(snap.nextStop, null, `expected no nextStop at return index ${idx}`)
    assert.equal(snap.distanceToNextStopM, null)
    assert.equal(snap.timeToNextStopSec, null)
    assert.equal(snap.completedStopsCount, parsed.stops.length)

    const expectedRemaining = parsed.totalDistanceM - parsed.cumulativeDistancesM[idx]
    assert.ok(
      Math.abs(snap.remainingDistanceM - expectedRemaining) < 1e-6,
      `remaining ${snap.remainingDistanceM} m vs expected ${expectedRemaining} m at index ${idx}`,
    )
  }

  const atEnd = computeWalkSnapshot(parsed, maxIndex)
  assert.equal(atEnd.remainingDistanceM, 0)
})

test('stops snap to the right vertices along the outbound leg in strictly increasing order', () => {
  const midIndex = (parsed.coordinates.length - 1) / 2
  assert.equal(parsed.stops.length, 5)
  assert.equal(parsed.stops[0].routeIndex, 0, 'stop 1 should start at vertex 0')
  assert.equal(parsed.stops[parsed.stops.length - 1].routeIndex, midIndex)

  for (let i = 0; i < parsed.stops.length; i++) {
    const stop = parsed.stops[i]
    assert.equal(stop.order, i + 1)
    assert.ok(
      stop.routeIndex <= midIndex,
      `stop #${stop.order} snapped to return leg index ${stop.routeIndex} (> ${midIndex})`,
    )
    assert.ok(
      stop.offsetFromRouteM < 1e-3,
      `stop #${stop.order} should sit on its route vertex (offset ${stop.offsetFromRouteM} m)`,
    )
    assert.deepEqual(stop.coordinates, parsed.coordinates[stop.routeIndex])

    if (i > 0) {
      const prev = parsed.stops[i - 1]
      assert.ok(
        stop.routeIndex > prev.routeIndex,
        `stop #${stop.order} index (${stop.routeIndex}) must be after stop #${prev.order} (${prev.routeIndex})`,
      )
      assert.ok(
        stop.distanceAlongRouteM > prev.distanceAlongRouteM,
        `stop #${stop.order} distance must be greater than stop #${prev.order}`,
      )
    }
  }
})

test('remaining time equals remaining distance divided by walking speed (2 km/h default)', () => {
  assert.equal(DEFAULT_WALK_SPEED_KMH, 2)
  assert.ok(Math.abs(DEFAULT_WALK_SPEED_MPS - 2 / 3.6) < 1e-12)

  const sampleIndices = [0, 150, 796, 1200, parsed.coordinates.length - 1]
  for (const idx of sampleIndices) {
    const snap = computeWalkSnapshot(parsed, idx)
    const expectedSec = snap.remainingDistanceM / DEFAULT_WALK_SPEED_MPS
    assert.ok(
      Math.abs(snap.remainingTimeSec - expectedSec) < 1e-9,
      `remainingTimeSec ${snap.remainingTimeSec} vs ${expectedSec} at index ${idx}`,
    )

    const expectedElapsedSec = snap.walkedDistanceM / DEFAULT_WALK_SPEED_MPS
    assert.ok(
      Math.abs(snap.elapsedTimeSec - expectedElapsedSec) < 1e-9,
      `elapsedTimeSec ${snap.elapsedTimeSec} vs ${expectedElapsedSec} at index ${idx}`,
    )
  }
})
