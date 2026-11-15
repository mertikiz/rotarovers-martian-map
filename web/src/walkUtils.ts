import { getDistance } from 'ol/sphere.js'
import { MARS_RADIUS_M } from './geo.ts'

export { MARS_RADIUS_M }

/**
 * Assumed EVA walking speed: 2 km/h, the level-terrain rate in NASA's Exploration EVA System Concept of Operations
 * (EVA-EXP-0042 Rev B, 2020, PDF p. 95), which adds that crews are slower on harder terrain. Lunar, not Mars;
 * labelled as an assumption in the UI.
 */
export const DEFAULT_WALK_SPEED_KMH = 2
export const DEFAULT_WALK_SPEED_MPS = DEFAULT_WALK_SPEED_KMH / 3.6
/** Shown wherever the speed is stated, so every screen names the same source. */
export const WALK_SPEED_NOTE = 'NASA lunar EVA level-terrain rate; slower on slopes'

export const FOOTPRINT_BOUNDS = {
  minLon: 137.1716,
  maxLon: 137.2895,
  minLat: -5.2217,
  maxLat: -4.9504,
} as const

export type LonLat = [number, number]

export interface RouteFeatureProperties {
  role: 'route'
  sample?: boolean
  length_m?: number
  outbound_length_m?: number
  max_slope_deg?: number
  climb_m?: number
  descent_m?: number
  /** Out from the base through the stops and back along the same path (pipeline/route.py). */
  round_trip?: boolean
  /** One DTM elevation in metres per route coordinate, in the same order. */
  elevation_m?: number[]
}

export interface StopFeatureProperties {
  role: 'stop'
  order: number
  name: string
  why_habitability?: string
  source_url?: string
  notes?: string
  snapped_m?: number
  sample?: boolean
}

export interface RouteCollectionProperties {
  dtm?: string
  cell_m?: number
  slope_limit_deg?: number
  note?: string
  sample?: boolean
  sample_note?: string
}

export interface GeoJSONFeature {
  type: 'Feature'
  properties: RouteFeatureProperties | StopFeatureProperties | Record<string, unknown>
  geometry:
    | { type: 'LineString'; coordinates: LonLat[] }
    | { type: 'Point'; coordinates: LonLat }
}

export interface RouteFeatureCollection {
  type: 'FeatureCollection'
  properties?: RouteCollectionProperties
  features: GeoJSONFeature[]
}

export interface ResolvedStop {
  order: number
  name: string
  coordinates: LonLat
  routeIndex: number
  distanceAlongRouteM: number
  offsetFromRouteM: number
  snappedM?: number
  whyHabitability?: string
  sourceUrl?: string
  notes?: string
  sample?: boolean
}

export interface ParsedRouteData {
  coordinates: LonLat[]
  cumulativeDistancesM: number[]
  /** Elevation in metres at each route vertex (same length as coordinates), if present in GeoJSON. */
  elevationsM?: number[]
  minElevationM?: number
  maxElevationM?: number
  totalDistanceM: number
  reportedLengthM?: number
  maxSlopeDeg?: number
  climbM?: number
  descentM?: number
  stops: ResolvedStop[]
  isSample: boolean
  isRoundTrip: boolean
  sampleNote?: string
  dtm?: string
  slopeLimitDeg?: number
  outsideFootprintCount: number
}

export interface WalkSnapshot {
  currentIndex: number
  currentCoord: LonLat
  currentElevationM?: number
  /** Local signed terrain slope in degrees (+ uphill, - downhill along travel direction). */
  currentSlopeDeg?: number
  /** Local travel bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West). */
  currentHeadingDeg?: number
  /** 16-wind compass cardinal label for currentHeadingDeg (e.g. 'NNW', 'SSE'). */
  currentCardinal?: string
  /** Maximum absolute slope in degrees within the next 50 m along the route. */
  maxSlopeAhead50mDeg?: number
  /** Cumulative elevation gain (m) walked from start up to currentIndex. */
  walkedClimbM?: number
  /** Cumulative elevation loss (m) walked from start up to currentIndex. */
  walkedDescentM?: number
  walkedDistanceM: number
  remainingDistanceM: number
  progressPercent: number
  elapsedTimeSec: number
  remainingTimeSec: number
  totalTimeSec: number
  turnaroundDistanceM: number
  turnaroundTimeSec: number
  distanceToTurnaroundM: number
  timeToTurnaroundSec: number
  isPastTurnaround: boolean
  isAtTurnaround: boolean
  currentStop: ResolvedStop | null
  nextStop: ResolvedStop | null
  distanceToNextStopM: number | null
  timeToNextStopSec: number | null
  completedStopsCount: number
}

export interface RouteLeg {
  legNumber: number
  fromLabel: string
  toLabel: string
  startIndex: number
  endIndex: number
  startDistanceM: number
  endDistanceM: number
  lengthM: number
  durationSec: number
  climbM: number
  descentM: number
  maxSlopeDeg: number
  isReturnLeg: boolean
}

export interface SteepInterval {
  startIndex: number
  endIndex: number
  startDistanceM: number
  endDistanceM: number
  peakSlopeDeg: number
}

export function isInsideFootprint([lon, lat]: LonLat): boolean {
  return (
    lon >= FOOTPRINT_BOUNDS.minLon &&
    lon <= FOOTPRINT_BOUNDS.maxLon &&
    lat >= FOOTPRINT_BOUNDS.minLat &&
    lat <= FOOTPRINT_BOUNDS.maxLat
  )
}

export function marsDistanceM(a: LonLat, b: LonLat): number {
  return getDistance(a, b, MARS_RADIUS_M)
}

const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

/**
 * Forward azimuth (bearing) in degrees [0, 360) from point `a` to point `b` on the sphere.
 */
export function marsBearingDeg([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const toRad = Math.PI / 180
  const phi1 = lat1 * toRad
  const phi2 = lat2 * toRad
  const dLambda = (lon2 - lon1) * toRad

  const y = Math.sin(dLambda) * Math.cos(phi2)
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda)
  const thetaDeg = (Math.atan2(y, x) * 180) / Math.PI
  return ((thetaDeg % 360) + 360) % 360
}

export function formatCardinal(bearingDeg: number): string {
  const normalized = ((bearingDeg % 360) + 360) % 360
  const idx = Math.round(normalized / 22.5) % 16
  return COMPASS_POINTS[idx]
}

/**
 * Parses a RouteFeatureCollection into precomputed cumulative Mars distances
 * and snaps stops to their nearest vertex along the route so that any route size
 * (from 4 points to 10,000+ points) evaluates in O(1) during slider updates.
 */
export function parseRouteGeoJSON(geojson: RouteFeatureCollection): ParsedRouteData {
  const routeFeature = geojson.features.find(
    (f) => f.geometry.type === 'LineString' && f.properties?.role === 'route',
  )

  if (!routeFeature || routeFeature.geometry.type !== 'LineString') {
    throw new Error('GeoJSON does not contain a valid LineString feature with role="route".')
  }

  const coordinates = routeFeature.geometry.coordinates
  if (coordinates.length < 2) {
    throw new Error('Route LineString must have at least 2 coordinate points.')
  }

  const cumulativeDistancesM: number[] = new Array(coordinates.length)
  cumulativeDistancesM[0] = 0
  let outsideFootprintCount = isInsideFootprint(coordinates[0]) ? 0 : 1

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]
    const curr = coordinates[i]
    if (!isInsideFootprint(curr)) {
      outsideFootprintCount++
    }
    const segM = marsDistanceM(prev, curr)
    cumulativeDistancesM[i] = cumulativeDistancesM[i - 1] + segM
  }

  const totalDistanceM = cumulativeDistancesM[cumulativeDistancesM.length - 1]
  const routeProps = routeFeature.properties as RouteFeatureProperties
  const isRoundTrip = routeProps.round_trip === true

  let elevationsM: number[] | undefined
  let minElevationM: number | undefined
  let maxElevationM: number | undefined

  if (
    Array.isArray(routeProps.elevation_m) &&
    routeProps.elevation_m.length === coordinates.length &&
    routeProps.elevation_m.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    elevationsM = routeProps.elevation_m
    let minE = Infinity
    let maxE = -Infinity
    for (const e of elevationsM) {
      if (e < minE) minE = e
      if (e > maxE) maxE = e
    }
    minElevationM = minE
    maxElevationM = maxE
  }

  // On a round-trip route the second half retraces the outbound vertices in reverse.
  // Snap stops along the outbound leg so stop markers sit on the outbound half of the profile.
  const searchLimit = isRoundTrip
    ? Math.floor((coordinates.length - 1) / 2) + 1
    : coordinates.length

  const rawStops = geojson.features.filter(
    (f) => f.geometry.type === 'Point' && f.properties?.role === 'stop',
  )

  const stops: ResolvedStop[] = rawStops
    .map((f) => {
      const coords = (f.geometry as { type: 'Point'; coordinates: LonLat }).coordinates
      const props = f.properties as StopFeatureProperties

      // Find nearest route vertex using Mars sphere distance
      let bestIdx = 0
      let bestDist = Infinity
      for (let i = 0; i < searchLimit; i++) {
        const d = marsDistanceM(coords, coordinates[i])
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      }

      return {
        order: Number(props.order ?? 0),
        name: String(props.name ?? `Stop ${props.order ?? ''}`),
        coordinates: coords,
        routeIndex: bestIdx,
        distanceAlongRouteM: cumulativeDistancesM[bestIdx],
        offsetFromRouteM: bestDist,
        snappedM: typeof props.snapped_m === 'number' ? props.snapped_m : undefined,
        whyHabitability: props.why_habitability,
        sourceUrl: props.source_url,
        notes: props.notes,
        sample: Boolean(props.sample),
      }
    })
    .sort((a, b) => a.order - b.order)

  const colProps = geojson.properties ?? {}
  const isSample = Boolean(
    colProps.sample || routeProps.sample || stops.some((s) => s.sample),
  )

  return {
    coordinates,
    cumulativeDistancesM,
    elevationsM,
    minElevationM,
    maxElevationM,
    totalDistanceM,
    reportedLengthM:
      typeof routeProps.length_m === 'number' ? routeProps.length_m : undefined,
    maxSlopeDeg:
      typeof routeProps.max_slope_deg === 'number' ? routeProps.max_slope_deg : undefined,
    climbM: typeof routeProps.climb_m === 'number' ? routeProps.climb_m : undefined,
    descentM: typeof routeProps.descent_m === 'number' ? routeProps.descent_m : undefined,
    stops,
    isSample,
    isRoundTrip,
    sampleNote: colProps.sample_note ?? colProps.note,
    dtm: colProps.dtm,
    slopeLimitDeg: colProps.slope_limit_deg,
    outsideFootprintCount,
  }
}

/**
 * Computes the walk status at a given vertex index along the route.
 */
export function computeWalkSnapshot(
  route: ParsedRouteData,
  index: number,
  speedMps: number = DEFAULT_WALK_SPEED_MPS,
): WalkSnapshot {
  const maxIndex = route.coordinates.length - 1
  const currentIndex = Math.max(0, Math.min(maxIndex, Math.round(index)))
  const currentCoord = route.coordinates[currentIndex]
  const currentElevationM = route.elevationsM?.[currentIndex]
  const walkedDistanceM = route.cumulativeDistancesM[currentIndex]
  const totalDistanceM = route.totalDistanceM
  const remainingDistanceM = Math.max(0, totalDistanceM - walkedDistanceM)
  const progressPercent =
    totalDistanceM > 0 ? (walkedDistanceM / totalDistanceM) * 100 : 0

  // Compute local heading and signed slope along the direction of travel
  let currentHeadingDeg: number | undefined
  let currentCardinal: string | undefined
  let currentSlopeDeg: number | undefined
  let maxSlopeAhead50mDeg: number | undefined
  let walkedClimbM: number | undefined
  let walkedDescentM: number | undefined

  const stepFromIdx = currentIndex < maxIndex ? currentIndex : Math.max(0, currentIndex - 1)
  const stepToIdx = currentIndex < maxIndex ? currentIndex + 1 : currentIndex
  if (stepToIdx > stepFromIdx) {
    const pA = route.coordinates[stepFromIdx]
    const pB = route.coordinates[stepToIdx]
    if (pA[0] !== pB[0] || pA[1] !== pB[1]) {
      currentHeadingDeg = marsBearingDeg(pA, pB)
      currentCardinal = formatCardinal(currentHeadingDeg)
    }
  }

  if (route.elevationsM && route.elevationsM.length === route.coordinates.length) {
    const elevs = route.elevationsM
    const dists = route.cumulativeDistancesM

    if (stepToIdx > stepFromIdx) {
      const ds = dists[stepToIdx] - dists[stepFromIdx]
      const dz = elevs[stepToIdx] - elevs[stepFromIdx]
      currentSlopeDeg = ds > 0.01 ? (Math.atan(dz / ds) * 180) / Math.PI : 0
    }

    // Look ahead 50 m along the route for the steepest local segment
    let maxAhead = 0
    for (let i = currentIndex; i < maxIndex; i++) {
      if (dists[i] - walkedDistanceM > 50) break
      const ds = dists[i + 1] - dists[i]
      if (ds > 0.01) {
        const dz = Math.abs(elevs[i + 1] - elevs[i])
        const deg = (Math.atan(dz / ds) * 180) / Math.PI
        if (deg > maxAhead) maxAhead = deg
      }
    }
    maxSlopeAhead50mDeg = maxAhead

    // Cumulative climb and descent walked so far
    let climbSoFar = 0
    let descentSoFar = 0
    for (let i = 1; i <= currentIndex; i++) {
      const dz = elevs[i] - elevs[i - 1]
      if (dz > 0) climbSoFar += dz
      else if (dz < 0) descentSoFar += -dz
    }
    walkedClimbM = climbSoFar
    walkedDescentM = descentSoFar
  }

  const safeSpeed = speedMps > 0 ? speedMps : DEFAULT_WALK_SPEED_MPS
  const elapsedTimeSec = walkedDistanceM / safeSpeed
  const remainingTimeSec = remainingDistanceM / safeSpeed
  const totalTimeSec = totalDistanceM / safeSpeed

  // Turnaround point = half of total walk duration / distance
  const turnaroundDistanceM = totalDistanceM / 2
  const turnaroundTimeSec = totalTimeSec / 2
  const distanceToTurnaroundM = turnaroundDistanceM - walkedDistanceM
  const timeToTurnaroundSec = distanceToTurnaroundM / safeSpeed
  const isPastTurnaround = walkedDistanceM > turnaroundDistanceM + 0.5
  const isAtTurnaround = Math.abs(walkedDistanceM - turnaroundDistanceM) <= 0.5

  // Stop tracking: tolerance of 0.5 m so reaching a stop vertex counts as reached
  const STOP_TOLERANCE_M = 0.5
  let currentStop: ResolvedStop | null = null
  let nextStop: ResolvedStop | null = null
  let completedStopsCount = 0

  for (const stop of route.stops) {
    if (Math.abs(stop.distanceAlongRouteM - walkedDistanceM) <= STOP_TOLERANCE_M) {
      currentStop = stop
    }
    if (stop.distanceAlongRouteM <= walkedDistanceM + STOP_TOLERANCE_M) {
      completedStopsCount++
    } else if (!nextStop) {
      nextStop = stop
    }
  }

  const distanceToNextStopM = nextStop
    ? Math.max(0, nextStop.distanceAlongRouteM - walkedDistanceM)
    : null
  const timeToNextStopSec =
    distanceToNextStopM !== null ? distanceToNextStopM / safeSpeed : null

  return {
    currentIndex,
    currentCoord,
    currentElevationM,
    currentSlopeDeg,
    currentHeadingDeg,
    currentCardinal,
    maxSlopeAhead50mDeg,
    walkedClimbM,
    walkedDescentM,
    walkedDistanceM,
    remainingDistanceM,
    progressPercent,
    elapsedTimeSec,
    remainingTimeSec,
    totalTimeSec,
    turnaroundDistanceM,
    turnaroundTimeSec,
    distanceToTurnaroundM,
    timeToTurnaroundSec,
    isPastTurnaround,
    isAtTurnaround,
    currentStop,
    nextStop,
    distanceToNextStopM,
    timeToNextStopSec,
    completedStopsCount,
  }
}

export function formatDistance(metres: number): string {
  const abs = Math.abs(metres)
  if (abs >= 1000) {
    return `${(metres / 1000).toFixed(2)} km (${Math.round(metres)} m)`
  }
  return `${Math.round(metres)} m`
}

export function formatDuration(seconds: number): string {
  const totalSec = Math.max(0, Math.round(seconds))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  return `${secs}s`
}

export function formatLonLat([lon, lat]: LonLat): string {
  const lonStr = `${Math.abs(lon).toFixed(5)}°${lon >= 0 ? 'E' : 'W'}`
  const latStr = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}`
  return `${lonStr}, ${latStr}`
}

/**
 * Breaks the route into stop-to-stop legs (plus the return leg to Base on a round-trip route)
 * and computes distance, duration, climb, descent, and maximum local slope for each leg.
 */
export function computeRouteLegs(
  route: ParsedRouteData,
  speedMps: number = DEFAULT_WALK_SPEED_MPS,
): RouteLeg[] {
  if (route.stops.length < 2) {
    return []
  }

  const safeSpeed = speedMps > 0 ? speedMps : DEFAULT_WALK_SPEED_MPS
  const dists = route.cumulativeDistancesM
  const elevs = route.elevationsM
  const legs: RouteLeg[] = []

  const buildLeg = (
    legNumber: number,
    fromLabel: string,
    toLabel: string,
    startIndex: number,
    endIndex: number,
    isReturnLeg: boolean,
  ): RouteLeg => {
    const startDistanceM = dists[startIndex]
    const endDistanceM = dists[endIndex]
    const lengthM = Math.max(0, endDistanceM - startDistanceM)
    const durationSec = lengthM / safeSpeed

    let climbM = 0
    let descentM = 0
    let maxSlopeDeg = 0

    if (elevs && elevs.length === route.coordinates.length) {
      for (let i = startIndex; i < endIndex; i++) {
        const dz = elevs[i + 1] - elevs[i]
        if (dz > 0) climbM += dz
        else if (dz < 0) descentM += -dz

        const ds = dists[i + 1] - dists[i]
        if (ds > 0.01) {
          const deg = (Math.atan(Math.abs(dz) / ds) * 180) / Math.PI
          if (deg > maxSlopeDeg) maxSlopeDeg = deg
        }
      }
    }

    return {
      legNumber,
      fromLabel,
      toLabel,
      startIndex,
      endIndex,
      startDistanceM,
      endDistanceM,
      lengthM,
      durationSec,
      climbM,
      descentM,
      maxSlopeDeg,
      isReturnLeg,
    }
  }

  for (let i = 0; i < route.stops.length - 1; i++) {
    const a = route.stops[i]
    const b = route.stops[i + 1]
    if (b.routeIndex > a.routeIndex) {
      legs.push(
        buildLeg(
          legs.length + 1,
          `#${a.order} ${a.name}`,
          `#${b.order} ${b.name}`,
          a.routeIndex,
          b.routeIndex,
          false,
        ),
      )
    }
  }

  const lastStop = route.stops[route.stops.length - 1]
  const maxIndex = route.coordinates.length - 1
  if (route.isRoundTrip && maxIndex > lastStop.routeIndex) {
    legs.push(
      buildLeg(
        legs.length + 1,
        `#${lastStop.order} ${lastStop.name}`,
        'Base (Return)',
        lastStop.routeIndex,
        maxIndex,
        true,
      ),
    )
  }

  return legs
}

/**
 * Finds contiguous route intervals where the local segment slope is at or above `thresholdDeg` (default 15°).
 */
export function findSteepIntervals(
  route: ParsedRouteData,
  thresholdDeg: number = 15,
): SteepInterval[] {
  const elevs = route.elevationsM
  const dists = route.cumulativeDistancesM
  if (!elevs || elevs.length !== route.coordinates.length) {
    return []
  }

  const intervals: SteepInterval[] = []
  let active: SteepInterval | null = null

  for (let i = 0; i < route.coordinates.length - 1; i++) {
    const ds = dists[i + 1] - dists[i]
    if (ds <= 0.01) continue
    const dz = Math.abs(elevs[i + 1] - elevs[i])
    const deg = (Math.atan(dz / ds) * 180) / Math.PI

    if (deg >= thresholdDeg) {
      if (!active) {
        active = {
          startIndex: i,
          endIndex: i + 1,
          startDistanceM: dists[i],
          endDistanceM: dists[i + 1],
          peakSlopeDeg: deg,
        }
      } else {
        active.endIndex = i + 1
        active.endDistanceM = dists[i + 1]
        if (deg > active.peakSlopeDeg) active.peakSlopeDeg = deg
      }
    } else if (active) {
      intervals.push(active)
      active = null
    }
  }

  if (active) {
    intervals.push(active)
  }

  return intervals
}
