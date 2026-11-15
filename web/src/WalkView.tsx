import { useEffect, useId, useMemo, useState } from 'react'
import ElevationProfile from './ElevationProfile'
import {
  computeWalkSnapshot,
  DEFAULT_WALK_SPEED_KMH,
  DEFAULT_WALK_SPEED_MPS,
  WALK_SPEED_NOTE,
  formatDistance,
  formatDuration,
  formatLonLat,
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

export function WalkView({
  routeData,
  initialUrl = '/data/route.geojson',
  onPositionChange,
}: WalkViewProps) {
  const sliderId = useId()
  const sourceUrl = initialUrl
  const [fetchedGeoJSON, setFetchedGeoJSON] = useState<RouteFeatureCollection | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!routeData)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackMultiplier, setPlaybackMultiplier] = useState<10 | 30 | 60>(30)
  const [copiedLog, setCopiedLog] = useState<boolean>(false)

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

  // Automated walk playback timer
  useEffect(() => {
    if (!isPlaying || !parsedRoute) {
      return
    }

    const maxIdx = parsedRoute.coordinates.length - 1
    // At 2 km/h (~0.556 m/s) and ~5.3 m per vertex, 1 vertex is ~9.5 s of real walk time.
    // Tick interval scales with playbackMultiplier (10x, 30x, 60x).
    const intervalMs = Math.max(40, Math.round(2400 / playbackMultiplier))

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIdx) {
          setIsPlaying(false)
          return maxIdx
        }
        return prev + 1
      })
    }, intervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [isPlaying, playbackMultiplier, parsedRoute])

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
      </section>
    )
  }

  const maxIndex = parsedRoute.coordinates.length - 1
  // Adaptive step size for "+10% / -10%" jump buttons on ~1000-point or 4-point routes
  const bigStep = Math.max(1, Math.round(maxIndex * 0.05))

  const handleIndexChange = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, nextIdx))
    setCurrentIndex(clamped)
  }

  const handleTogglePlay = () => {
    if (!isPlaying && snapshot.currentIndex >= maxIndex) {
      setCurrentIndex(0)
    }
    setIsPlaying((prev) => !prev)
  }

  const handleCopyTraverseLog = () => {
    const lines: string[] = [
      '# RotaRovers EVA Traverse Waypoint Sheet',
      `Route length: ${formatDistance(parsedRoute.totalDistanceM)} · Assumed speed: ${DEFAULT_WALK_SPEED_KMH} km/h (${WALK_SPEED_NOTE})`,
      '',
      '| Stop | Name | Coordinates | Distance | Elevation | ETA (from start) |',
      '|---|---|---|---|---|---|',
    ]

    for (const s of parsedRoute.stops) {
      const elev = parsedRoute.elevationsM?.[s.routeIndex]
      const elevStr =
        elev !== undefined
          ? `${elev < 0 ? '−' : ''}${Math.abs(Math.round(elev))} m`
          : '—'
      const etaSec = s.distanceAlongRouteM / DEFAULT_WALK_SPEED_MPS
      lines.push(
        `| #${s.order} | ${s.name} | ${formatLonLat(s.coordinates)} | ${formatDistance(s.distanceAlongRouteM)} | ${elevStr} | ${formatDuration(etaSec)} |`,
      )
    }

    if (parsedRoute.isRoundTrip) {
      const endElev = parsedRoute.elevationsM?.[maxIndex]
      const endElevStr =
        endElev !== undefined
          ? `${endElev < 0 ? '−' : ''}${Math.abs(Math.round(endElev))} m`
          : '—'
      lines.push(
        `| Base (Return) | Start / End Base | ${formatLonLat(parsedRoute.coordinates[maxIndex])} | ${formatDistance(parsedRoute.totalDistanceM)} | ${endElevStr} | ${formatDuration(snapshot.totalTimeSec)} |`,
      )
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        setCopiedLog(true)
        window.setTimeout(() => setCopiedLog(false), 2500)
      })
    }
  }

  const returning = parsedRoute.isRoundTrip && snapshot.isPastTurnaround

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
            What the astronaut follows on the walk. No GPS here: move the slider to simulate progress.
          </p>
        </div>
      </header>

      {parsedRoute.isSample && (
        <div className="walk-banner walk-banner--sample" role="status">
          <span>
            <strong>Sample / Placeholder Notice:</strong>{' '}
            {parsedRoute.sampleNote ??
              'This file contains sample or placeholder data for development.'}
          </span>
        </div>
      )}

      {parsedRoute.outsideFootprintCount > 0 && (
        <div className="walk-banner walk-banner--turnaround-warn" role="alert">
          Warning: {parsedRoute.outsideFootprintCount} route point(s) lie outside the study
          DTM footprint.
        </div>
      )}

      {/* Turnaround status banner. On a round trip the turnaround is the last stop, so being past it means
          the crew is on the planned way back, not over budget. */}
      <div
        className={`walk-banner ${
          snapshot.isPastTurnaround && !returning
            ? 'walk-banner--turnaround-warn'
            : 'walk-banner--turnaround-ok'
        }`}
        role="status"
      >
        {returning ? (
          snapshot.remainingDistanceM > 0.5 ? (
            <span>
              Returning to base along the same path: {formatDistance(snapshot.remainingDistanceM)} (
              {formatDuration(snapshot.remainingTimeSec)}) to go.
            </span>
          ) : (
            <span>Back at base. Walk complete.</span>
          )
        ) : snapshot.isPastTurnaround ? (
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
              Back 5%
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === 0}
              onClick={() => handleIndexChange(snapshot.currentIndex - 1)}
            >
              Step back
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === maxIndex}
              onClick={() => handleIndexChange(snapshot.currentIndex + 1)}
            >
              Step forward
            </button>
            <button
              type="button"
              className="walk-btn"
              disabled={snapshot.currentIndex === maxIndex}
              onClick={() => handleIndexChange(snapshot.currentIndex + bigStep)}
            >
              Forward 5%
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
              className={`walk-btn ${isPlaying ? 'walk-btn--playing' : ''}`}
              onClick={handleTogglePlay}
            >
              {isPlaying ? 'Pause walk' : 'Play walk'}
            </button>
            <div className="walk-speed-pills" role="group" aria-label="Simulation playback speed">
              {([10, 30, 60] as const).map((mult) => (
                <button
                  key={mult}
                  type="button"
                  className={`walk-btn walk-btn--compact ${
                    playbackMultiplier === mult ? 'walk-btn--playing' : ''
                  }`}
                  onClick={() => setPlaybackMultiplier(mult)}
                >
                  {mult}×
                </button>
              ))}
            </div>
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

      {/* Route Elevation Profile */}
      <ElevationProfile
        route={parsedRoute}
        snapshot={snapshot}
        onSelectIndex={handleIndexChange}
      />

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
              {snapshot.currentHeadingDeg !== undefined && snapshot.currentCardinal
                ? ` · Heading ${Math.round(snapshot.currentHeadingDeg)}° ${snapshot.currentCardinal}`
                : ''}
            </p>
          </div>
          <p className="walk-card-footer">
            {snapshot.currentStop
              ? `At Stop #${snapshot.currentStop.order}: ${snapshot.currentStop.name}`
              : `Elapsed time: ${formatDuration(snapshot.elapsedTimeSec)}${
                  snapshot.currentSlopeDeg !== undefined
                    ? ` · Local slope ${snapshot.currentSlopeDeg >= 0 ? '+' : '−'}${Math.abs(snapshot.currentSlopeDeg).toFixed(1)}°`
                    : ''
                }`}
          </p>
        </article>

        {/* 2. Next stop and distance to it */}
        <article className="walk-card">
          <h3 className="walk-card-label">2. Next Stop</h3>
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
            ) : parsedRoute.isRoundTrip && snapshot.remainingDistanceM > 0.5 ? (
              <>
                <p className="walk-card-value">Base</p>
                <p className="walk-card-sub">
                  {formatDistance(snapshot.remainingDistanceM)} ahead · ETA{' '}
                  {formatDuration(snapshot.remainingTimeSec)}
                </p>
              </>
            ) : parsedRoute.isRoundTrip ? (
              <>
                <p className="walk-card-value">Back at Base</p>
                <p className="walk-card-sub">All planned stops visited</p>
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
            Assumption: constant {DEFAULT_WALK_SPEED_KMH} km/h ({WALK_SPEED_NOTE})
          </p>
        </article>

        {/* 4. Turnaround point */}
        <article
          className={`walk-card ${snapshot.isPastTurnaround && !returning ? 'walk-card--alert' : ''}`}
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
            {parsedRoute.isRoundTrip ? ': the last stop, where the walk turns back' : ''}
          </p>
        </article>
      </div>

      {/* Stops List & Route Terrain Metrics */}
      <div className="walk-details-grid">
        <div className="walk-panel">
          <div className="walk-panel-header-row">
            <h3 className="walk-panel-title">Planned Stops Along Route</h3>
            <button
              type="button"
              className="walk-stop-jump-btn"
              onClick={handleCopyTraverseLog}
            >
              {copiedLog ? 'Copied EVA sheet!' : 'Copy EVA waypoint sheet'}
            </button>
          </div>
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
              <dt className="walk-meta-term">
                {parsedRoute.isRoundTrip ? 'Round-trip Length' : 'Route Length'}
              </dt>
              <dd className="walk-meta-desc">
                {formatDistance(parsedRoute.totalDistanceM)}
              </dd>
            </div>
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
            {snapshot.walkedClimbM !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">Walked Climb / Descent</dt>
                <dd className="walk-meta-desc">
                  +{snapshot.walkedClimbM.toFixed(1)} m / −
                  {(snapshot.walkedDescentM ?? 0).toFixed(1)} m
                </dd>
              </div>
            )}
            {snapshot.maxSlopeAhead50mDeg !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">Max Slope Next 50 m</dt>
                <dd className="walk-meta-desc">
                  {snapshot.maxSlopeAhead50mDeg.toFixed(1)}°
                  {snapshot.maxSlopeAhead50mDeg >= 15 && (
                    <span className="walk-elev-meta-sub"> (steep segment)</span>
                  )}
                </dd>
              </div>
            )}
            <div className="walk-meta-item">
              <dt className="walk-meta-term">Assumed Walk Speed</dt>
              <dd className="walk-meta-desc">
                {DEFAULT_WALK_SPEED_KMH} km/h ({DEFAULT_WALK_SPEED_MPS.toFixed(2)} m/s)
                <span className="walk-elev-meta-sub"> · {WALK_SPEED_NOTE}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}

export default WalkView
