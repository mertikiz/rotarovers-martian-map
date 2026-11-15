import { useContext, useEffect, useId, useMemo, useState } from 'react'
import ElevationProfile from './ElevationProfile'
import {
  computeRouteLegs,
  computeWalkSnapshot,
  DEFAULT_WALK_SPEED_KMH,
  DEFAULT_WALK_SPEED_MPS,
  WALK_SPEED_NOTE,
  formatDistance,
  formatDuration,
  formatLonLat,
  localizeCompass,
  parseRouteGeoJSON,
  type ParsedRouteData,
  type RouteFeatureCollection,
} from './walkUtils'
import './WalkView.css'
import { LangContext, useT } from './langContext.ts'

type TransportIconName = 'start' | 'prevStop' | 'back' | 'play' | 'pause' | 'forward' | 'nextStop' | 'end'

const TRANSPORT_PATHS: Record<TransportIconName, string> = {
  start: 'M6 5v14M18 6l-9 6 9 6z',
  prevStop: 'M18 6l-6 6 6 6M12 6l-6 6 6 6',
  back: 'M15 6l-6 6 6 6',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  forward: 'M9 6l6 6-6 6',
  nextStop: 'M6 6l6 6-6 6M12 6l6 6-6 6',
  end: 'M18 5v14M6 6l9 6-9 6z',
}

function TransportIcon({ icon }: { icon: TransportIconName }) {
  const filled = icon === 'play' || icon === 'start' || icon === 'end'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth={icon === 'pause' ? 3 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={TRANSPORT_PATHS[icon]} fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

/** Icon-only stepping control; the label is its tooltip and accessible name. */
function IconButton({ icon, label, disabled, onClick }: {
  icon: TransportIconName; label: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button type="button" className="walk-icon-btn" aria-label={label} title={label} disabled={disabled}
      onClick={onClick}>
      <TransportIcon icon={icon} />
    </button>
  )
}

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
  const t = useT()
  const { lang } = useContext(LangContext)
  const fmtDur = (sec: number) => formatDuration(sec, lang)
  const fmtLL = (c: [number, number]) => formatLonLat(c, lang)
  const legLabel = (label: string) => {
    const m = label.match(/^#(\d+) (.*)$/)
    return m ? `#${m[1]} ${t(m[2])}` : t(label)
  }
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

  const routeLegs = useMemo(() => {
    if (!parsedRoute) return []
    return computeRouteLegs(parsedRoute, DEFAULT_WALK_SPEED_MPS)
  }, [parsedRoute])

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
        <p>{t('Loading Marswalk route data…')}</p>
      </section>
    )
  }

  if (effectiveError || !parsedRoute || !snapshot) {
    return (
      <section className="walk-view" role="alert">
        <h2>{t('Unable to load Marswalk route')}</h2>
        <p>{effectiveError ?? 'Unknown route parsing error.'}</p>
      </section>
    )
  }

  const maxIndex = parsedRoute.coordinates.length - 1
  // Adaptive step size for "+10% / -10%" jump buttons on ~1000-point or 4-point routes

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

  const buildTraverseMarkdown = (): string => {
    const lines: string[] = [
      '# RotaRovers EVA Traverse Waypoint & Leg Sheet',
      `Route length: ${formatDistance(parsedRoute.totalDistanceM)} · Assumed speed: ${DEFAULT_WALK_SPEED_KMH} km/h (${WALK_SPEED_NOTE})`,
      '',
      '## Science Stops',
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

    if (routeLegs.length > 0) {
      lines.push(
        '',
        '## Leg-by-Leg Breakdown',
        '| Leg | Segment | Distance | Duration | Climb / Descent | Max Slope |',
        '|---|---|---|---|---|---|',
      )
      for (const leg of routeLegs) {
        lines.push(
          `| Leg ${leg.legNumber} | ${leg.fromLabel} → ${leg.toLabel} | ${formatDistance(leg.lengthM)} | ${formatDuration(leg.durationSec)} | +${leg.climbM.toFixed(1)} m / −${leg.descentM.toFixed(1)} m | ${leg.maxSlopeDeg.toFixed(1)}° |`,
        )
      }
    }

    return lines.join('\n')
  }

  const handleCopyTraverseLog = () => {
    const md = buildTraverseMarkdown()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopiedLog(true)
        window.setTimeout(() => setCopiedLog(false), 2500)
      })
    }
  }

  const handleDownloadTraverseLog = () => {
    const md = buildTraverseMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rotarovers-eva-traverse-sheet.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const returning = parsedRoute.isRoundTrip && snapshot.isPastTurnaround

  const prevStop = [...parsedRoute.stops]
    .reverse()
    .find((s) => s.routeIndex < snapshot.currentIndex)
  const nextStopByIndex = parsedRoute.stops.find(
    (s) => s.routeIndex > snapshot.currentIndex,
  )

  return (
    <section className="walk-view" aria-label={t('Marswalk Traverse Tracker')}>
      <header className="walk-header">
        <div className="walk-title-group">
          <h2 className="walk-title">{t('Marswalk Traverse View')}</h2>
          <p className="walk-subtitle">
            {t('What the astronaut follows on the walk. No GPS here: move the slider to simulate progress.')}
          </p>
        </div>
      </header>

      {parsedRoute.isSample && (
        <div className="walk-banner walk-banner--sample" role="status">
          <span>
            <strong>{t('Sample / Placeholder Notice:')}</strong>{' '}
            {parsedRoute.sampleNote ??
              'This file contains sample or placeholder data for development.'}
          </span>
        </div>
      )}

      {parsedRoute.outsideFootprintCount > 0 && (
        <div className="walk-banner walk-banner--turnaround-warn" role="alert">
          {t('Warning: {n} route point(s) lie outside the study DTM footprint.', {
            n: parsedRoute.outsideFootprintCount,
          })}
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
              {t('Returning to base along the same path: {dist} ({time}) to go.', {
                dist: formatDistance(snapshot.remainingDistanceM),
                time: fmtDur(snapshot.remainingTimeSec),
              })}
            </span>
          ) : (
            <span>{t('Back at base. Walk complete.')}</span>
          )
        ) : snapshot.isPastTurnaround ? (
          <span>
            {t(
              'TURNAROUND POINT PASSED: You have exceeded 50% of the planned walk duration ({dist} past half-way threshold).',
              { dist: formatDistance(Math.abs(snapshot.distanceToTurnaroundM)) },
            )}
          </span>
        ) : snapshot.isAtTurnaround ? (
          <span>{t('AT TURNAROUND POINT: You are at exactly 50% of the planned walk duration.')}</span>
        ) : (
          <span>
            {t('Before Turnaround Point: {dist} ({time}) remaining until the 50% walk threshold.', {
              dist: formatDistance(snapshot.distanceToTurnaroundM),
              time: fmtDur(snapshot.timeToTurnaroundSec),
            })}
          </span>
        )}
      </div>

      {/* Position Slider & Step Controls */}
      <div className="walk-controls-panel">
        <div className="walk-slider-header">
          <label htmlFor={sliderId} className="walk-slider-label">
            {t('Simulated Astronaut Position Along Route')}
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
          aria-valuetext={t('{walked} walked of {total} ({pct} percent)', {
            walked: formatDistance(snapshot.walkedDistanceM),
            total: formatDistance(parsedRoute.totalDistanceM),
            pct: snapshot.progressPercent.toFixed(1),
          })}
          style={
            {
              '--attr-min': 0,
              '--attr-max': maxIndex,
              '--control-value': snapshot.currentIndex,
            } as React.CSSProperties
          }
          onChange={(e) => handleIndexChange(Number(e.target.value))}
        />

        {/* Player layout: play in the middle, stepping controls mirrored on each side, speed below. */}
        <div className="walk-transport">
          <IconButton icon="start" label={t('Start')} disabled={snapshot.currentIndex === 0}
            onClick={() => handleIndexChange(0)} />
          <IconButton icon="prevStop" label={t('Prev Stop')} disabled={!prevStop}
            onClick={() => prevStop && handleIndexChange(prevStop.routeIndex)} />
          <IconButton icon="back" label={t('Step back')} disabled={snapshot.currentIndex === 0}
            onClick={() => handleIndexChange(snapshot.currentIndex - 1)} />
          <button type="button" className="walk-play" aria-pressed={isPlaying} onClick={handleTogglePlay}>
            <TransportIcon icon={isPlaying ? 'pause' : 'play'} />
            {isPlaying ? t('Pause walk') : t('Play walk')}
          </button>
          <IconButton icon="forward" label={t('Step forward')} disabled={snapshot.currentIndex === maxIndex}
            onClick={() => handleIndexChange(snapshot.currentIndex + 1)} />
          <IconButton icon="nextStop" label={t('Next Stop')} disabled={!nextStopByIndex}
            onClick={() => nextStopByIndex && handleIndexChange(nextStopByIndex.routeIndex)} />
          <IconButton icon="end" label={t('End')} disabled={snapshot.currentIndex === maxIndex}
            onClick={() => handleIndexChange(maxIndex)} />
        </div>
        <div className="walk-speed-row">
          <span id={`${sliderId}-speed`}>{t('Speed')}</span>
          <div className="seg" role="group" aria-labelledby={`${sliderId}-speed`}>
            {([10, 30, 60] as const).map((mult) => (
              <button key={mult} type="button" aria-pressed={playbackMultiplier === mult}
                onClick={() => setPlaybackMultiplier(mult)}>
                {mult}×
              </button>
            ))}
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
          <h3 className="walk-card-label">{t('1. Current Position (Where Am I)')}</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">{fmtLL(snapshot.currentCoord)}</p>
            <p className="walk-card-sub">
              {t('Walked: {dist} ({pct}%)', {
                dist: formatDistance(snapshot.walkedDistanceM),
                pct: snapshot.progressPercent.toFixed(1),
              })}
              {snapshot.currentHeadingDeg !== undefined && snapshot.currentCardinal
                ? t(' · Heading {deg}° {cardinal}', {
                    deg: Math.round(snapshot.currentHeadingDeg),
                    cardinal: localizeCompass(snapshot.currentCardinal, lang),
                  })
                : ''}
            </p>
          </div>
          <p className="walk-card-footer">
            {snapshot.currentStop
              ? t('At Stop #{n}: {name}', { n: snapshot.currentStop.order, name: t(snapshot.currentStop.name) })
              : t('Elapsed time: {time}', { time: fmtDur(snapshot.elapsedTimeSec) }) +
                (snapshot.currentSlopeDeg !== undefined
                  ? t(' · Local slope {slope}°', {
                      slope:
                        (snapshot.currentSlopeDeg >= 0 ? '+' : '−') + Math.abs(snapshot.currentSlopeDeg).toFixed(1),
                    })
                  : '')}
          </p>
        </article>

        {/* 2. Next stop and distance to it */}
        <article className="walk-card">
          <h3 className="walk-card-label">{t('2. Next Stop')}</h3>
          <div className="walk-card-main">
            {snapshot.nextStop && snapshot.distanceToNextStopM !== null ? (
              <>
                <p className="walk-card-value">
                  #{snapshot.nextStop.order} {t(snapshot.nextStop.name)}
                </p>
                <p className="walk-card-sub">
                  {t('{dist} ahead · ETA {time}', {
                    dist: formatDistance(snapshot.distanceToNextStopM),
                    time: fmtDur(snapshot.timeToNextStopSec ?? 0),
                  })}
                </p>
              </>
            ) : parsedRoute.isRoundTrip && snapshot.remainingDistanceM > 0.5 ? (
              <>
                <p className="walk-card-value">{t('Base')}</p>
                <p className="walk-card-sub">
                  {t('{dist} ahead · ETA {time}', {
                    dist: formatDistance(snapshot.remainingDistanceM),
                    time: fmtDur(snapshot.remainingTimeSec),
                  })}
                </p>
              </>
            ) : parsedRoute.isRoundTrip ? (
              <>
                <p className="walk-card-value">{t('Back at Base')}</p>
                <p className="walk-card-sub">{t('All planned stops visited')}</p>
              </>
            ) : (
              <>
                <p className="walk-card-value">{t('Final Stop Reached')}</p>
                <p className="walk-card-sub">{t('All planned stops visited along route')}</p>
              </>
            )}
          </div>
          <p className="walk-card-footer">
            {t('Stops visited: {done} / {total}', {
              done: snapshot.completedStopsCount,
              total: parsedRoute.stops.length,
            })}
          </p>
        </article>

        {/* 3. Total remaining distance & estimated time */}
        <article className="walk-card">
          <h3 className="walk-card-label">{t('3. Total Remaining Distance & Time')}</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">
              {formatDistance(snapshot.remainingDistanceM)}
            </p>
            <p className="walk-card-sub">
              {t('Est. remaining time: {time}', { time: fmtDur(snapshot.remainingTimeSec) })}
            </p>
          </div>
          <p className="walk-card-footer">
            {t('Assumption: constant {speed} km/h ({note})', { speed: DEFAULT_WALK_SPEED_KMH, note: t(WALK_SPEED_NOTE) })}
          </p>
        </article>

        {/* 4. Turnaround point */}
        <article
          className={`walk-card ${snapshot.isPastTurnaround && !returning ? 'walk-card--alert' : ''}`}
        >
          <h3 className="walk-card-label">{t('4. Turnaround Point (50% Budget)')}</h3>
          <div className="walk-card-main">
            <p className="walk-card-value">
              {t('At {dist} ({time})', {
                dist: formatDistance(snapshot.turnaroundDistanceM),
                time: fmtDur(snapshot.turnaroundTimeSec),
              })}
            </p>
            <p className="walk-card-sub">
              {snapshot.isPastTurnaround
                ? t('Passed by {dist} ({time})', {
                    dist: formatDistance(Math.abs(snapshot.distanceToTurnaroundM)),
                    time: fmtDur(Math.abs(snapshot.timeToTurnaroundSec)),
                  })
                : t('{dist} ({time}) until turnaround', {
                    dist: formatDistance(snapshot.distanceToTurnaroundM),
                    time: fmtDur(snapshot.timeToTurnaroundSec),
                  })}
            </p>
          </div>
          <p className="walk-card-footer">
            {t('Half-duration mark of total {time} walk', { time: fmtDur(snapshot.totalTimeSec) })}
            {parsedRoute.isRoundTrip ? t(': the last stop, where the walk turns back') : ''}
          </p>
        </article>
      </div>

      {/* Stops List & Route Terrain Metrics */}
      <div className="walk-details-grid">
        <div className="walk-panel">
          <div className="walk-panel-header-row">
            <h3 className="walk-panel-title">{t('Planned Stops Along Route')}</h3>
            <div className="walk-step-group">
              <button
                type="button"
                className="walk-stop-jump-btn"
                onClick={handleCopyTraverseLog}
              >
                {copiedLog ? t('Copied EVA sheet!') : t('Copy EVA sheet')}
              </button>
              <button
                type="button"
                className="walk-stop-jump-btn"
                onClick={handleDownloadTraverseLog}
              >
                {t('Download .md')}
              </button>
            </div>
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
                      #{stop.order} {t(stop.name)}
                    </strong>{' '}
                    <span className="walk-slider-readout">
                      ({fmtLL(stop.coordinates)})
                    </span>
                    <div className="walk-slider-readout">
                      {t('At {dist} along route', { dist: formatDistance(stop.distanceAlongRouteM) })} ·{' '}
                      {isCurrent
                        ? t('Here now')
                        : deltaM > 0
                          ? t('{dist} ahead', { dist: formatDistance(deltaM) })
                          : t('Passed {dist} ago', { dist: formatDistance(Math.abs(deltaM)) })}
                      {stop.snappedM !== undefined && stop.snappedM > 0
                        ? t(' · snapped {m} m', { m: stop.snappedM.toFixed(1) })
                        : ''}
                    </div>
                    {stop.whyHabitability && (
                      <div className="walk-slider-readout">{t(stop.whyHabitability)}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="walk-stop-jump-btn"
                    onClick={() => handleIndexChange(stop.routeIndex)}
                  >
                    {t('Jump here')}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="walk-panel">
          <h3 className="walk-panel-title">{t('Route & Terrain Parameters')}</h3>
          <dl className="walk-meta-list">
            <div className="walk-meta-item">
              <dt className="walk-meta-term">
                {t(parsedRoute.isRoundTrip ? 'Round-trip Length' : 'Route Length')}
              </dt>
              <dd className="walk-meta-desc">
                {formatDistance(parsedRoute.totalDistanceM)}
              </dd>
            </div>
            {parsedRoute.maxSlopeDeg !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">{t('Max Route Slope')}</dt>
                <dd className="walk-meta-desc">
                  {t('{deg}° (limit {limit}°)', {
                    deg: parsedRoute.maxSlopeDeg.toFixed(2),
                    limit: parsedRoute.slopeLimitDeg ?? 20,
                  })}
                </dd>
              </div>
            )}
            {parsedRoute.climbM !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">{t('Total Climb / Descent')}</dt>
                <dd className="walk-meta-desc">
                  +{parsedRoute.climbM.toFixed(1)} m / −
                  {(parsedRoute.descentM ?? 0).toFixed(1)} m
                </dd>
              </div>
            )}
            {snapshot.walkedClimbM !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">{t('Walked Climb / Descent')}</dt>
                <dd className="walk-meta-desc">
                  +{snapshot.walkedClimbM.toFixed(1)} m / −
                  {(snapshot.walkedDescentM ?? 0).toFixed(1)} m
                </dd>
              </div>
            )}
            {snapshot.maxSlopeAhead50mDeg !== undefined && (
              <div className="walk-meta-item">
                <dt className="walk-meta-term">{t('Max Slope Next 50 m')}</dt>
                <dd className="walk-meta-desc">
                  {snapshot.maxSlopeAhead50mDeg.toFixed(1)}°
                  {snapshot.maxSlopeAhead50mDeg >= 15 && (
                    <span className="walk-elev-meta-sub">{t(' (steep segment)')}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="walk-meta-item">
              <dt className="walk-meta-term">{t('Base Separation (Straight)')}</dt>
              <dd className="walk-meta-desc">
                {formatDistance(snapshot.straightLineFromBaseM)}
              </dd>
            </div>
            <div className="walk-meta-item">
              <dt className="walk-meta-term">{t('Route Walkback to Base')}</dt>
              <dd className="walk-meta-desc">
                {formatDistance(snapshot.walkbackDistanceM)} (
                {fmtDur(snapshot.walkbackTimeSec)})
              </dd>
            </div>
            <div className="walk-meta-item">
              <dt className="walk-meta-term">{t('Assumed Walk Speed')}</dt>
              <dd className="walk-meta-desc">
                {DEFAULT_WALK_SPEED_KMH} {t('km/h')} ({DEFAULT_WALK_SPEED_MPS.toFixed(2)} m/s)
                <span className="walk-elev-meta-sub"> · {t(WALK_SPEED_NOTE)}</span>
              </dd>
            </div>
          </dl>

          {routeLegs.length > 0 && (
            <div className="walk-legs-section">
              <h4 className="walk-legs-subtitle">{t('Leg-by-Leg Traverse Breakdown')}</h4>
              <ol className="walk-stops-list">
                {routeLegs.map((leg) => {
                  const isActiveLeg =
                    snapshot.currentIndex >= leg.startIndex &&
                    snapshot.currentIndex < leg.endIndex
                  const isCompletedLeg = snapshot.currentIndex >= leg.endIndex

                  let legClass = 'walk-stop-item'
                  if (isActiveLeg) legClass += ' walk-stop-item--next'
                  else if (isCompletedLeg) legClass += ' walk-stop-item--reached'

                  return (
                    <li key={leg.legNumber} className={legClass}>
                      <div>
                        <strong>
                          {t('Leg {n}: {from} → {to}', { n: leg.legNumber, from: legLabel(leg.fromLabel), to: legLabel(leg.toLabel) })}
                        </strong>
                        <div className="walk-slider-readout">
                          {formatDistance(leg.lengthM)} · {fmtDur(leg.durationSec)}{' '}
                          · +{leg.climbM.toFixed(1)} m / −{leg.descentM.toFixed(1)} m ·
                          {t('max slope {deg}°', { deg: leg.maxSlopeDeg.toFixed(1) })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="walk-stop-jump-btn"
                        onClick={() => handleIndexChange(leg.startIndex)}
                      >
                        {isActiveLeg
                          ? t('In progress')
                          : isCompletedLeg
                            ? t('Completed')
                            : t('Start leg')}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default WalkView
