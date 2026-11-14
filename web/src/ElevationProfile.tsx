import { useId, useMemo } from 'react'
import { formatDistance, type ParsedRouteData, type WalkSnapshot } from './walkUtils'

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

export function ElevationProfile({
  route,
  snapshot,
  onSelectIndex,
}: ElevationProfileProps) {
  const titleId = useId()
  const descId = useId()

  const elevations = route.elevationsM
  const distances = route.cumulativeDistancesM
  const totalDistanceM = route.totalDistanceM

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

  const summaryText = `Route elevation profile from ${formatElev(chartData.minE)} (lowest point) to ${formatElev(
    chartData.maxE,
  )} (highest point)${
    route.climbM !== undefined ? `, with +${route.climbM.toFixed(1)} m total climb` : ''
  }${
    route.descentM !== undefined ? ` and −${route.descentM.toFixed(1)} m total descent` : ''
  }. Current astronaut position is at ${formatDistance(
    snapshot.walkedDistanceM,
  )}, elevation ${formatElev(currentPt.elev)}.`

  return (
    <div className="walk-panel walk-elevation-panel">
      <div className="walk-elevation-header">
        <div>
          <h3 className="walk-panel-title walk-elevation-title">
            Route Elevation Profile
          </h3>
          <p className="walk-elevation-subtitle">
            {route.isRoundTrip
              ? 'Round-trip profile (symmetric around the turnaround at Stop #5). Click any stop marker to jump there.'
              : 'Elevation along the planned route.'}
          </p>
        </div>
        <div className="walk-elevation-live" aria-live="polite">
          Current elevation: <strong>{formatElev(currentPt.elev)}</strong>
        </div>
      </div>

      <div className="walk-elevation-chart-wrap">
        <svg
          className="walk-elevation-svg"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>Marswalk Route Elevation Profile</title>
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
            Walked distance along route
          </text>

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
              ? `Turnaround (Stop #${lastStop.order})`
              : 'Turnaround (50%)'}
          </text>

          {/* Base markers (start at 0 m, and end at totalDistanceM if round-trip) */}
          <g
            className="walk-elev-marker-click"
            onClick={() => onSelectIndex?.(0)}
          >
            <title>Base (Start of walk, 0 m, {formatElev(startPt.elev)})</title>
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
              Base
            </text>
          </g>

          {route.isRoundTrip && (
            <g
              className="walk-elev-marker-click"
              onClick={() => onSelectIndex?.(chartData.points.length - 1)}
            >
              <title>
                Base (End of round trip, {formatDistance(totalDistanceM)},{' '}
                {formatElev(endPt.elev)})
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
                Base (Return)
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
                onClick={() => onSelectIndex?.(stop.routeIndex)}
              >
                <title>
                  Stop #{stop.order}: {stop.name} ({formatDistance(stop.distanceAlongRouteM)},{' '}
                  {formatElev(pt.elev)})
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
      <dl className="walk-elevation-summary" aria-label="Elevation profile summary">
        <div className="walk-meta-item">
          <dt className="walk-meta-term">Lowest Point</dt>
          <dd className="walk-meta-desc">
            {formatElev(chartData.minE)}{' '}
            <span className="walk-elev-meta-sub">
              (at {formatDistance(chartData.minDist)})
            </span>
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">Highest Point</dt>
          <dd className="walk-meta-desc">
            {formatElev(chartData.maxE)}{' '}
            <span className="walk-elev-meta-sub">
              (at {formatDistance(chartData.maxDist)})
            </span>
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">Total Climb / Descent</dt>
          <dd className="walk-meta-desc">
            {route.climbM !== undefined
              ? `+${route.climbM.toFixed(1)} m / −${(route.descentM ?? 0).toFixed(1)} m`
              : `${Math.round(chartData.maxE - chartData.minE)} m span`}
          </dd>
        </div>
        <div className="walk-meta-item">
          <dt className="walk-meta-term">Astronaut Elevation</dt>
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
