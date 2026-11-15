import { useId, useMemo, useState } from 'react'
import {
  findSteepIntervals,
  formatDistance,
  type ParsedRouteData,
  type WalkSnapshot,
} from './walkUtils'
import { useT } from './langContext.ts'

export interface ElevationProfileProps {
  route: ParsedRouteData
  snapshot: WalkSnapshot
  onSelectIndex?: (index: number) => void
}

const SVG_WIDTH = 760
const SVG_HEIGHT = 235
const PAD_LEFT = 58
const PAD_RIGHT = 24
const PAD_TOP = 32
const PAD_BOTTOM = 42
const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM

function formatElev(metres: number): string {
  const m = Math.round(metres)
  return `${m < 0 ? '−' : ''}${Math.abs(m)} m` // true minus sign, as in the rest of the app
}

function formatSignedSlope(deg: number, t: (en: string, vars?: Record<string, string | number>) => string): string {
  const abs = Math.abs(deg).toFixed(1)
  if (Math.abs(deg) < 0.2) return t('0.0° (level)')
  return deg > 0 ? t('+{deg}° uphill', { deg: abs }) : t('−{deg}° downhill', { deg: abs })
}

export function ElevationProfile({
  route,
  snapshot,
  onSelectIndex,
}: ElevationProfileProps) {
  const titleId = useId()
  const descId = useId()
  const t = useT()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const elevations = route.elevationsM
  const distances = route.cumulativeDistancesM
  const totalDistanceM = route.totalDistanceM

  const steepBands = useMemo(() => findSteepIntervals(route, 15), [route])

  const chartData = useMemo(() => {
    if (!elevations || elevations.length < 2 || totalDistanceM <= 0) {
      return null
    }

    let minE = Infinity
    let maxE = -Infinity
    let minIdx = 0
    let maxIdx = 0

    for (let i = 0; i < elevations.length; i++) {
      const e = elevations[i]
      if (e < minE) {
        minE = e
        minIdx = i
      }
      if (e > maxE) {
        maxE = e
        maxIdx = i
      }
    }

    const spanE = Math.max(10, maxE - minE)
    const padE = spanE * 0.08
    const domainMinE = minE - padE
    const domainMaxE = maxE + padE
    const domainSpanE = domainMaxE - domainMinE

    const xOfDist = (d: number) => PAD_LEFT + (d / totalDistanceM) * PLOT_W
    const yOfElev = (e: number) =>
      PAD_TOP + PLOT_H - ((e - domainMinE) / domainSpanE) * PLOT_H

    const points: Array<{ x: number; y: number; dist: number; elev: number }> =
      new Array(elevations.length)

    for (let i = 0; i < elevations.length; i++) {
      const dist = distances[i]
      const elev = elevations[i]
      points[i] = {
        x: xOfDist(dist),
        y: yOfElev(elev),
        dist,
        elev,
      }
    }

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')

    const baselineY = PAD_TOP + PLOT_H
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L${points[0].x.toFixed(1)},${baselineY.toFixed(1)} Z`

    // Y-axis ticks (4 ticks between minE and maxE)
    const yTicks = [0, 0.33, 0.67, 1].map((t) => {
      const val = minE + t * (maxE - minE)
      return {
        value: val,
        y: yOfElev(val),
      }
    })

    // X-axis ticks (0%, 25%, 50%, 75%, 100%)
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const dist = t * totalDistanceM
      return {
        dist,
        x: xOfDist(dist),
        label:
          dist === 0
            ? '0 km'
            : `${(dist / 1000).toFixed(dist >= 10000 ? 1 : 2)} km`,
      }
    })

    return {
      minE,
      maxE,
      minDist: distances[minIdx],
      maxDist: distances[maxIdx],
      points,
      linePath,
      areaPath,
      baselineY,
      yTicks,
      xTicks,
      xOfDist,
      yOfElev,
    }
  }, [elevations, distances, totalDistanceM])

  if (!chartData || !elevations) {
    return null
  }

  const walkedIdx = Math.max(0, Math.min(chartData.points.length - 1, snapshot.currentIndex))
  const currentPt = chartData.points[walkedIdx]

  const walkedLinePath = chartData.points
    .slice(0, walkedIdx + 1)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const walkedAreaPath =
    walkedIdx > 0
      ? `${walkedLinePath} L${currentPt.x.toFixed(1)},${chartData.baselineY.toFixed(1)} L${chartData.points[0].x.toFixed(1)},${chartData.baselineY.toFixed(1)} Z`
      : ''

  const turnaroundX = chartData.xOfDist(snapshot.turnaroundDistanceM)
  const lastStop =
    route.stops.length > 0 ? route.stops[route.stops.length - 1] : undefined
  const startPt = chartData.points[0]
  const endPt = chartData.points[chartData.points.length - 1]

  const summaryText = t(
    'Route elevation profile from {min} (lowest point) to {max} (highest point), with +{climb} m total climb and −{descent} m total descent. Current astronaut position is at {dist}, elevation {elev}.',
    {
      min: formatElev(chartData.minE),
      max: formatElev(chartData.maxE),
      climb: (route.climbM ?? 0).toFixed(1),
      descent: (route.descentM ?? 0).toFixed(1),
      dist: formatDistance(snapshot.walkedDistanceM),
      elev: formatElev(currentPt.elev),
    },
  )

  const resolveIndexFromMouseEvent = (e: React.MouseEvent<SVGSVGElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return null
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH
    const ratio = Math.max(0, Math.min(1, (svgX - PAD_LEFT) / PLOT_W))
    const targetDist = ratio * totalDistanceM

    let lo = 0
    let hi = distances.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (distances[mid] < targetDist) lo = mid + 1
      else hi = mid
    }
    if (
      lo > 0 &&
      Math.abs(distances[lo - 1] - targetDist) < Math.abs(distances[lo] - targetDist)
    ) {
      lo = lo - 1
    }
    return lo
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSelectIndex) return
    const idx = resolveIndexFromMouseEvent(e)
    if (idx !== null) onSelectIndex(idx)
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const idx = resolveIndexFromMouseEvent(e)
    setHoverIndex(idx)
  }

  const hoverPt =
    hoverIndex !== null && hoverIndex !== walkedIdx
      ? chartData.points[hoverIndex]
      : null

  return (
    <div className="walk-panel walk-elevation-panel">
      <div className="walk-elevation-header">
        <div>
          <h3 className="walk-panel-title walk-elevation-title">
            {t('Route Elevation Profile')}
          </h3>
          <p className="walk-elevation-subtitle">
            {route.isRoundTrip
              ? t(
                  'Round-trip profile (symmetric around the turnaround at Stop #{n}). Click anywhere along the profile or a stop marker to jump there.',
                  { n: lastStop?.order ?? '' },
                )
              : t('Elevation along the planned route. Click anywhere along the profile to jump there.')}
          </p>
        </div>
        <div className="walk-elevation-live" aria-live="polite">
          {hoverPt ? (
            <>
              {t('Inspect:')} <strong>{formatElev(hoverPt.elev)}</strong> {t('at')}{' '}
              <strong>{formatDistance(hoverPt.dist)}</strong>
            </>
          ) : (
            <>
              {t('Current elevation:')} <strong>{formatElev(currentPt.elev)}</strong>
              {snapshot.currentSlopeDeg !== undefined && (
                <>
                  {' · '}{t('Slope:')}{' '}
                  <strong>{formatSignedSlope(snapshot.currentSlopeDeg, t)}</strong>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="walk-elevation-chart-wrap">
        <svg
          className="walk-elevation-svg walk-elevation-svg--interactive"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <title id={titleId}>{t('Marswalk Route Elevation Profile')}</title>
          <desc id={descId}>{summaryText}</desc>

          {/* Horizontal elevation grid lines & labels */}
          {chartData.yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={PAD_LEFT}
                y1={tick.y}
                x2={SVG_WIDTH - PAD_RIGHT}
                y2={tick.y}
                className="walk-elev-grid"
              />
              <text
                x={PAD_LEFT - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="walk-elev-axis-text"
              >
                {formatElev(tick.value)}
              </text>
            </g>
          ))}

          {/* X-axis baseline & distance ticks */}
          <line
            x1={PAD_LEFT}
            y1={chartData.baselineY}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={chartData.baselineY}
            className="walk-elev-axis-line"
          />
          {chartData.xTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={tick.x}
                y1={chartData.baselineY}
                x2={tick.x}
                y2={chartData.baselineY + 5}
                className="walk-elev-axis-line"
              />
              <text
                x={tick.x}
                y={chartData.baselineY + 18}
                textAnchor={
                  idx === 0
                    ? 'start'
                    : idx === chartData.xTicks.length - 1
                      ? 'end'
                      : 'middle'
                }
                className="walk-elev-axis-text"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text
            x={PAD_LEFT + PLOT_W / 2}
            y={SVG_HEIGHT - 4}
            textAnchor="middle"
            className="walk-elev-axis-caption"
          >
            {t('Walked distance along route')}
          </text>

          {/* Steep (15-20 deg) slope caution bands along baseline */}
          {steepBands.map((band, idx) => {
            const x1 = chartData.xOfDist(band.startDistanceM)
            const x2 = chartData.xOfDist(band.endDistanceM)
            const w = Math.max(2.5, x2 - x1)
            return (
              <rect
                key={`steep-${idx}`}
                x={x1}
                y={PAD_TOP}
                width={w}
                height={PLOT_H}
                className="walk-elev-steep-band"
              >
                <title>
                  {t('Steep slope section ({deg}°, 15–20° caution zone)', { deg: band.peakSlopeDeg.toFixed(1) })}
                </title>
              </rect>
            )
          })}

          {/* Full route area & line (upcoming / unwalked portion) */}
          <path d={chartData.areaPath} className="walk-elev-area-full" />
          <path d={chartData.linePath} className="walk-elev-line-full" />

          {/* Walked portion area & line */}
          {walkedAreaPath && (
            <path d={walkedAreaPath} className="walk-elev-area-walked" />
          )}
          {walkedIdx > 0 && (
            <path d={walkedLinePath} className="walk-elev-line-walked" />
          )}

          {/* Turnaround vertical dashed line */}
          <line
            x1={turnaroundX}
            y1={PAD_TOP - 8}
            x2={turnaroundX}
            y2={chartData.baselineY}
            className="walk-elev-turnaround-line"
          />
          <text
            x={turnaroundX}
            y={PAD_TOP - 13}
            textAnchor="middle"
            className="walk-elev-turnaround-label"
          >
            {lastStop && route.isRoundTrip
              ? t('Turnaround (Stop #{n})', { n: lastStop.order })
              : t('Turnaround (50%)')}
          </text>

          {/* Base markers (start at 0 m, and end at totalDistanceM if round-trip) */}
          <g
            className="walk-elev-marker-click"
            onClick={(e) => {
              e.stopPropagation()
              onSelectIndex?.(0)
            }}
          >
            <title>{t('Base (start of walk, 0 m, {elev})', { elev: formatElev(startPt.elev) })}</title>
            <rect
              x={startPt.x - 6}
              y={startPt.y - 6}
              width={12}
              height={12}
              rx={2}
              className="walk-elev-base-marker"
            />
            <text
              x={startPt.x}
              y={PAD_TOP - 13}
              textAnchor="start"
              className="walk-elev-base-label"
            >
              {t('Base')}
            </text>
          </g>

          {route.isRoundTrip && (
            <g
              className="walk-elev-marker-click"
              onClick={(e) => {
                e.stopPropagation()
                onSelectIndex?.(chartData.points.length - 1)
              }}
            >
              <title>
                {t('Base (end of round trip, {dist}, {elev})', {
                  dist: formatDistance(totalDistanceM),
                  elev: formatElev(endPt.elev),
                })}
              </title>
              <rect
                x={endPt.x - 6}
                y={endPt.y - 6}
                width={12}
                height={12}
                rx={2}
                className="walk-elev-base-marker"
              />
              <text
                x={endPt.x}
                y={PAD_TOP - 13}
                textAnchor="end"
                className="walk-elev-base-label"
              >
                {t('Base (Return)')}
              </text>
            </g>
          )}

          {/* Numbered stop markers (1..5) */}
          {route.stops.map((stop) => {
            const pt = chartData.points[stop.routeIndex]
            if (!pt) return null
            const isTurnaroundStop =
              route.isRoundTrip && lastStop?.order === stop.order
            return (
              <g
                key={stop.order}
                className="walk-elev-marker-click"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectIndex?.(stop.routeIndex)
                }}
              >
                <title>
                  {t('Stop #{n}: {name} ({dist}, {elev})', {
                    n: stop.order,
                    name: t(stop.name),
                    dist: formatDistance(stop.distanceAlongRouteM),
                    elev: formatElev(pt.elev),
                  })}
                </title>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isTurnaroundStop ? 10.5 : 9}
                  className={
                    isTurnaroundStop
                      ? 'walk-elev-stop-circle walk-elev-stop-circle--turnaround'
                      : 'walk-elev-stop-circle'
                  }
                />
                <text
                  x={pt.x}
                  y={pt.y + 3.5}
                  textAnchor="middle"
                  className="walk-elev-stop-text"
                >
                  {stop.order}
                </text>
              </g>
            )
          })}

          {/* Hover inspection crosshair */}
          {hoverPt && (
            <g pointerEvents="none">
              <line
                x1={hoverPt.x}
                y1={PAD_TOP}
                x2={hoverPt.x}
                y2={chartData.baselineY}
                className="walk-elev-hover-line"
              />
              <circle
                cx={hoverPt.x}
                cy={hoverPt.y}
                r={4}
                className="walk-elev-hover-dot"
              />
            </g>
          )}

          {/* Astronaut current position cursor & ring */}
          <g className="walk-elev-astronaut" pointerEvents="none">
            <line
              x1={currentPt.x}
              y1={PAD_TOP}
              x2={currentPt.x}
              y2={chartData.baselineY}
              className="walk-elev-cursor-line"
            />
            <circle
              cx={currentPt.x}
              cy={currentPt.y}
              r={8.5}
              className="walk-elev-cursor-halo"
            />
            <circle
              cx={currentPt.x}
              cy={currentPt.y}
              r={4.5}
              className="walk-elev-cursor-dot"
            />
          </g>
        </svg>
      </div>

      {/* Text summary beside/below the chart for screen readers and quick reading */}
      <dl className="walk-elevation-summary" aria-label={t('Elevation profile summary')}>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">{t('Lowest Point')}</dt>
          <dd className="walk-meta-desc">
            {formatElev(chartData.minE)}{' '}
            <span className="walk-elev-meta-sub">
              {t('(at {dist})', { dist: formatDistance(chartData.minDist) })}
            </span>
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">{t('Highest Point')}</dt>
          <dd className="walk-meta-desc">
            {formatElev(chartData.maxE)}{' '}
            <span className="walk-elev-meta-sub">
              {t('(at {dist})', { dist: formatDistance(chartData.maxDist) })}
            </span>
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">{t('Total Climb / Descent')}</dt>
          <dd className="walk-meta-desc">
            {route.climbM !== undefined
              ? `+${route.climbM.toFixed(1)} m / −${(route.descentM ?? 0).toFixed(1)} m`
              : t('{m} m span', { m: Math.round(chartData.maxE - chartData.minE) })}
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">{t('Astronaut Elevation')}</dt>
          <dd className="walk-meta-desc">
            {formatElev(currentPt.elev)}{' '}
            <span className="walk-elev-meta-sub">
              ({formatDistance(snapshot.walkedDistanceM)})
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default ElevationProfile
