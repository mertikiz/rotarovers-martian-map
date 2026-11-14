import { getDistance } from 'ol/sphere'

export const MARS_RADIUS_M = 3_396_190

/**
 * Default assumed EVA walking speed on Mars in m/s (~2.88 km/h).
 * Explicitly labelled as an assumption in the UI.
 */
export const DEFAULT_WALK_SPEED_MPS = 0.8

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
  max_slope_deg?: number
  climb_m?: number
  descent_m?: number
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
  totalDistanceM: number
  reportedLengthM?: number
  maxSlopeDeg?: number
  climbM?: number
  descentM?: number
  stops: ResolvedStop[]
  isSample: boolean
  sampleNote?: string
  dtm?: string
  slopeLimitDeg?: number
  outsideFootprintCount: number
}

export interface WalkSnapshot {
  currentIndex: number
  currentCoord: LonLat
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
      for (let i = 0; i < coordinates.length; i++) {
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
    totalDistanceM,
    reportedLengthM:
      typeof routeProps.length_m === 'number' ? routeProps.length_m : undefined,
    maxSlopeDeg:
      typeof routeProps.max_slope_deg === 'number' ? routeProps.max_slope_deg : undefined,
    climbM: typeof routeProps.climb_m === 'number' ? routeProps.climb_m : undefined,
    descentM: typeof routeProps.descent_m === 'number' ? routeProps.descent_m : undefined,
    stops,
    isSample,
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
  const walkedDistanceM = route.cumulativeDistancesM[currentIndex]
  const totalDistanceM = route.totalDistanceM
  const remainingDistanceM = Math.max(0, totalDistanceM - walkedDistanceM)
  const progressPercent =
    totalDistanceM > 0 ? (walkedDistanceM / totalDistanceM) * 100 : 0

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
