import { useEffect, useId, useMemo, useState } from 'react'
import {
  computeWalkSnapshot,
  DEFAULT_WALK_SPEED_MPS,
  formatDistance,
  formatDuration,
  formatLonLat,
  MARS_RADIUS_M,
  parseRouteGeoJSON,
  type ParsedRouteData,
  type RouteFeatureCollection,
} from './walkUtils'
import './WalkView.css'

export interface WalkViewProps {
  /**
   * Optional pre-loaded GeoJSON data. If omitted, WalkView fetches from `initialUrl`.
   */
  routeData?: RouteFeatureCollection
  /**
   * Default URL to load when `routeData` prop is not passed.
   * Defaults to `/data/route.geojson` (the real DTM-computed route) and falls back to sample.
   */
  initialUrl?: string
  /**
   * Optional callback fired whenever the astronaut's position changes along the route.
   */
  onPositionChange?: (coord: [number, number], index: number) => void
}

const ROUTE_SOURCES = [
  {
    label: 'Computed DTM Route (/data/route.geojson)',
    url: '/data/route.geojson',
  },
  {
    label: 'Sample Route (/sample/route-sample.geojson)',
    url: '/sample/route-sample.geojson',
  },
] as const

export function WalkView({
  routeData,
  initialUrl = '/data/route.geojson',
  onPositionChange,
}: WalkViewProps) {
  const sliderId = useId()
  const [sourceUrl, setSourceUrl] = useState<string>(initialUrl)
  const [fetchedGeoJSON, setFetchedGeoJSON] = useState<RouteFeatureCollection | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!routeData)
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  useEffect(() => {
    if (routeData) {
      return
    }

    let cancelled = false

    fetch(sourceUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} while loading ${sourceUrl}`)
        }
        return res.json() as Promise<RouteFeatureCollection>
      })
      .then((data) => {
        if (!cancelled) {
          setFetchedGeoJSON(data)
          setLoadError(null)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err))
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [routeData, sourceUrl])

  const activeGeoJSON = routeData ?? fetchedGeoJSON

  const parseResult = useMemo((): {
    route: ParsedRouteData | null
    error: string | null
  } => {
    if (!activeGeoJSON) return { route: null, error: null }
    try {
      return { route: parseRouteGeoJSON(activeGeoJSON), error: null }
    } catch (err: unknown) {
      return {
        route: null,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }, [activeGeoJSON])

  const parsedRoute = parseResult.route
  const effectiveError = loadError ?? parseResult.error
  const effectiveLoading = !routeData && isLoading

  const snapshot = useMemo(() => {
    if (!parsedRoute) return null
    return computeWalkSnapshot(parsedRoute, currentIndex, DEFAULT_WALK_SPEED_MPS)
  }, [parsedRoute, currentIndex])

  useEffect(() => {
    if (snapshot && onPositionChange) {
      onPositionChange(snapshot.currentCoord, snapshot.currentIndex)
    }
  }, [snapshot, onPositionChange])

  const handleSourceSwitch = (url: string) => {
    if (url === sourceUrl) return
    setIsLoading(true)
    setLoadError(null)
    setCurrentIndex(0)
    setSourceUrl(url)
  }

  if (effectiveLoading) {
    return (
      <section className="walk-view" aria-busy="true">
        <p>Loading Marswalk route data…</p>
      </section>
    )
  }

  if (effectiveError || !parsedRoute || !snapshot) {
    return (
      <section className="walk-view" role="alert">
        <h2>Unable to load Marswalk route</h2>
        <p>{effectiveError ?? 'Unknown route parsing error.'}</p>
        {!routeData && (
          <div className="walk-source-switcher">
            {ROUTE_SOURCES.map((src) => (
              <button
                key={src.url}
                type="button"
                className="walk-btn"
                onClick={() => handleSourceSwitch(src.url)}
              >
                Try {src.label}
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  const maxIndex = parsedRoute.coordinates.length - 1
  // Adaptive step size for "+10% / -10%" jump buttons on ~1000-point or 4-point routes
  const bigStep = Math.max(1, Math.round(maxIndex * 0.05))
  const speedKmh = (DEFAULT_WALK_SPEED_MPS * 3.6).toFixed(2)

  const handleIndexChange = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, nextIdx))
    setCurrentIndex(clamped)
  }

  const prevStop = [...parsedRoute.stops]
    .reverse()
    .find((s) => s.routeIndex < snapshot.currentIndex)
  const nextStopByIndex = parsedRoute.stops.find(
    (s) => s.routeIndex > snapshot.currentIndex,
  )

  return (
    <section className="walk-view" aria-label="Marswalk Traverse Tracker">
      <header className="walk-header">
        <div className="walk-title-group">
          <h2 className="walk-title">Marswalk Traverse View</h2>
          <p className="walk-subtitle">
            Gale crater south study area · Mars sphere radius{' '}
            {MARS_RADIUS_M.toLocaleString('en-US')} m
          </p>
        </div>

        {!routeData && (
          <div className="walk-source-switcher" role="group" aria-label="Route dataset">
            <span className="walk-source-label">Dataset:</span>
            {ROUTE_SOURCES.map((src) => (
              <button
                key={src.url}
                type="button"
                className={`walk-btn ${sourceUrl === src.url ? 'walk-btn--active' : ''}`}
                onClick={() => handleSourceSwitch(src.url)}
              >
                {src.url.includes('sample') ? 'Sample (4 pts)' : 'DTM Route (~1000 pts)'}
              </button>
            ))}
          </div>
        )}
      </header>

      {parsedRoute.isSample && (
        <div className="walk-banner walk-banner--sample" role="status">
          <span>
            <strong>Sample / Placeholder Notice:</strong>{' '}
            {parsedRoute.sampleNote ??
              'This file contains sample or placeholder data for development.'}
          </span>
          <span>Points: {parsedRoute.coordinates.length}</span>
        </div>
      )}

      {parsedRoute.outsideFootprintCount > 0 && (
        <div className="walk-banner walk-banner--turnaround-warn" role="alert">
          Warning: {parsedRoute.outsideFootprintCount} route point(s) lie outside the study
          DTM footprint.
        </div>
      )}

      {/* Turnaround status banner */}
      <div
        className={`walk-banner ${
          snapshot.isPastTurnaround
            ? 'walk-banner--turnaround-warn'
            : 'walk-banner--turnaround-ok'
        }`}
        role="status"
      >
        {snapshot.isPastTurnaround ? (
          <span>
            TURNAROUND POINT PASSED: You have exceeded 50% of the planned walk duration (
            {formatDistance( Math.abs(snapshot.distanceToTurnaroundM) )} past half-way
            threshold).
          </span>
        ) : snapshot.isAtTurnaround ? (
          <span>
            AT TURNAROUND POINT: You are at exactly 50% of the planned walk duration.
          </span>
        ) : (
          <span>
            Before Turnaround Point: {formatDistance(snapshot.distanceToTurnaroundM)} (
            {formatDuration(snapshot.timeToTurnaroundSec)}) remaining until the 50% walk
            threshold.
          </span>
        )}
      </div>

      {/* Position Slider & Step Controls */}
      <div className="walk-controls-panel">
        <div className="walk-slider-header">
          <label htmlFor={sliderId} className="walk-slider-label">
            Simulated Astronaut Position Along Route
          </label>
          <span className="walk-slider-readout">
            Point {snapshot.currentIndex + 1} / {parsedRoute.coordinates.length} ·{' '}
            {formatDistance(snapshot.walkedDistanceM)} /{' '}
            {formatDistance(parsedRoute.totalDistanceM)} (
            {snapshot.progressPercent.toFixed(1)}%)
          </span>
        </div>

        <input
          id={sliderId}
          type="range"
          className="walk-range-slider"
          min={0}
          max={maxIndex}
          step={1}
          value={snapshot.currentIndex}
          aria-valuetext={`${formatDistance(snapshot.walkedDistanceM)} walked of ${formatDistance(
            parsedRoute.totalDistanceM,
          )} (${snapshot.progressPercent.toFixed(1)} percent)`}
          style={
            {
              '--attr-min': 0,
              '--attr-max': maxIndex,
              '--control-value': snapshot.currentIndex,
            } as React.CSSProperties
          }
          onChange={(e) => handleIndexChange(Number(e.target.value))}
        />

        <div className="walk-step-buttons">
          <div className="walk-step-group">
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === 0}
              onClick={() => handleIndexChange(0)}
            >
              Start
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === 0}
              onClick={() => handleIndexChange(snapshot.currentIndex - bigStep)}
            >
              −{bigStep} pts
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === 0}
              onClick={() => handleIndexChange(snapshot.currentIndex - 1)}
            >
              −1 pt
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === maxIndex}
              onClick={() => handleIndexChange(snapshot.currentIndex + 1)}
            >
              +1 pt
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === maxIndex}
              onClick={() => handleIndexChange(snapshot.currentIndex + bigStep)}
            >
              +{bigStep} pts
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === maxIndex}
              onClick={() => handleIndexChange(maxIndex)}
            >
              End
            </button>
          </div>

          <div className="walk-step-group">
            <button
              type="button"
              className="walk-btn"
              disabled={!prevStop}
              onClick={() => prevStop && handleIndexChange(prevStop.routeIndex)}
            >
              Prev Stop
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={!nextStopByIndex}
              onClick={() =>
                nextStopByIndex && handleIndexChange(nextStopByIndex.routeIndex)
              }
            >
              Next Stop
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Walk Readout Cards */}
      <div className="walk-cards-grid">
        {/* 1. Where am I */}
        <article className="walk-card">
          <h3 className="walk-card-label">1. Current Position (Where Am I)</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">{formatLonLat(snapshot.currentCoord)}</p>
            <p className="walk-card-sub">
              Walked: {formatDistance(snapshot.walkedDistanceM)} (
              {snapshot.progressPercent.toFixed(1)}%)
            </p>
          </div>
          <p className="walk-card-footer">
            {snapshot.currentStop
              ? `At Stop #${snapshot.currentStop.order}: ${snapshot.currentStop.name}`
              : `Elapsed time: ${formatDuration(snapshot.elapsedTimeSec)}`}
          </p>
        </article>

        {/* 2. Next stop and distance to it */}
        <article className="walk-card">
          <h3 className="walk-card-label">2. Next Science Stop</h3>
          <div className="walk-card-main">
            {snapshot.nextStop && snapshot.distanceToNextStopM !== null ? (
              <>
                <p className="walk-card-value">
                  #{snapshot.nextStop.order} {snapshot.nextStop.name}
                </p>
                <p className="walk-card-sub">
                  {formatDistance(snapshot.distanceToNextStopM)} ahead · ETA{' '}
                  {formatDuration(snapshot.timeToNextStopSec ?? 0)}
                </p>
              </>
            ) : (
              <>
                <p className="walk-card-value">Final Stop Reached</p>
                <p className="walk-card-sub">All planned stops visited along route</p>
              </>
            )}
          </div>
          <p className="walk-card-footer">
            Stops visited: {snapshot.completedStopsCount} / {parsedRoute.stops.length}
          </p>
        </article>

        {/* 3. Total remaining distance & estimated time */}
        <article className="walk-card">
          <h3 className="walk-card-label">3. Total Remaining Distance &amp; Time</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">
              {formatDistance(snapshot.remainingDistanceM)}
            </p>
            <p className="walk-card-sub">
              Est. remaining time: {formatDuration(snapshot.remainingTimeSec)}
            </p>
          </div>
          <p className="walk-card-footer">
            Assumption: constant walking speed {DEFAULT_WALK_SPEED_MPS} m/s ({speedKmh}{' '}
            km/h)
          </p>
        </article>

        {/* 4. Turnaround point */}
        <article
          className={`walk-card ${snapshot.isPastTurnaround ? 'walk-card--alert' : ''}`}
        >
          <h3 className="walk-card-label">4. Turnaround Point (50% Budget)</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">
              At {formatDistance(snapshot.turnaroundDistanceM)} (
              {formatDuration(snapshot.turnaroundTimeSec)})
            </p>
            <p className="walk-card-sub">
              {snapshot.isPastTurnaround
                ? `Passed by ${formatDistance(Math.abs(snapshot.distanceToTurnaroundM))} (${formatDuration(
                    Math.abs(snapshot.timeToTurnaroundSec),
                  )})`
                : `${formatDistance(snapshot.distanceToTurnaroundM)} (${formatDuration(
                    snapshot.timeToTurnaroundSec,
                  )}) until turnaround`}
            </p>
          </div>
          <p className="walk-card-footer">
            Half-duration mark of total {formatDuration(snapshot.totalTimeSec)} walk
          </p>
        </article>
      </div>

      {/* Stops List & Route Terrain Metrics */}
      <div className="walk-details-grid">
        <div className="walk-panel">
          <h3 className="walk-panel-title">Planned Stops Along Route</h3>
          <ol className="walk-stops-list">
            {parsedRoute.stops.map((stop) => {
              const deltaM = stop.distanceAlongRouteM - snapshot.walkedDistanceM
              const isCurrent = snapshot.currentStop?.order === stop.order
              const isNext = snapshot.nextStop?.order === stop.order
              const isReached = deltaM <= 0.5

              let itemClass = 'walk-stop-item'
              if (isCurrent) itemClass += ' walk-stop-item--current'
              else if (isNext) itemClass += ' walk-stop-item--next'
              else if (isReached) itemClass += ' walk-stop-item--reached'

              return (
                <li key={stop.order} className={itemClass}>
                  <div>
                    <strong>
                      #{stop.order} {stop.name}
                    </strong>{' '}
                    <span className="walk-slider-readout">
                      ({formatLonLat(stop.coordinates)})
                    </span>
                    <div className="walk-slider-readout">
                      At {formatDistance(stop.distanceAlongRouteM)} along route ·{' '}
                      {isCurrent
                        ? 'Here now'
                        : deltaM > 0
                          ? `${formatDistance(deltaM)} ahead`
                          : `Passed ${formatDistance(Math.abs(deltaM))} ago`}
                      {stop.snappedM !== undefined && stop.snappedM > 0
                        ? ` · snapped ${stop.snappedM.toFixed(1)} m`
                        : ''}
                    </div>
                    {stop.whyHabitability && (
                      <div className="walk-slider-readout">{stop.whyHabitability}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="walk-stop-jump-btn"
                    onClick={() => handleIndexChange(stop.routeIndex)}
                  >
                    Jump here
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="walk-panel">
          <h3 className="walk-panel-title">Route &amp; Terrain Parameters</h3>
          <dl className="walk-meta-list">
            <div className="walk-meta-item">
              <dt className="walk-meta-term">Computed Length (Web)</dt>
              <dd className="walk-meta-desc">
                {formatDistance(parsedRoute.totalDistanceM)}
              </dd>
            </div>
            {parsedRoute.reportedLengthM !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">Pipeline Length (GeoJSON)</dt>
                <dd className="walk-meta-desc">
                  {formatDistance(parsedRoute.reportedLengthM)}
                </dd>
              </div>
            )}
            {parsedRoute.maxSlopeDeg !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">Max Route Slope</dt>
                <dd className="walk-meta-desc">
                  {parsedRoute.maxSlopeDeg.toFixed(2)}° (limit{' '}
                  {parsedRoute.slopeLimitDeg ?? 20}°)
                </dd>
              </div>
            )}
            {parsedRoute.climbM !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">Total Climb / Descent</dt>
                <dd className="walk-meta-desc">
                  +{parsedRoute.climbM.toFixed(1)} m / −
                  {(parsedRoute.descentM ?? 0).toFixed(1)} m
                </dd>
              </div>
            )}
            <div className="walk-meta-item">
              <dt className="walk-meta-term">Route Vertices</dt>
              <dd className="walk-meta-desc">
                {parsedRoute.coordinates.length.toLocaleString('en-US')} pts
              </dd>
            </div>
            <div className="walk-meta-item">
              <dt className="walk-meta-term">Assumed Walk Speed</dt>
              <dd className="walk-meta-desc">
                {DEFAULT_WALK_SPEED_MPS} m/s ({speedKmh} km/h)
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}

export default WalkView
