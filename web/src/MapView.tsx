import { useEffect, useRef, useState, type ReactNode } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import ImageLayer from 'ol/layer/Image.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { Circle, Icon, Stroke, Style } from 'ol/style.js'
import type LineString from 'ol/geom/LineString.js'
import type { FeatureLike } from 'ol/Feature.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { transform } from 'ol/proj.js'
import 'ol/ol.css'
import { EQC, LONLAT } from './mars.ts'
import { routeLengthM, type LonLat } from './geo.ts'
import { getJson, safeHttpUrl } from './url.ts'
import { ALL_LAYERS_ON, MAP_LAYERS, setLayer, type LayerKey } from './layerToggles.ts'
import { LangSwitch } from './Lang.tsx'
import { useT } from './langContext.ts'
import { ThemeSwitch } from './Theme.tsx'
import { BASE_ICON, badgeSvg, smoothLine, stopIcon, withAlpha } from './track.ts'
import { useTheme } from './themeContext.ts'

export type Mode = 'plan' | 'walk'

/** Map scale when Walk mode starts (metres per pixel): about 1.5 km across a laptop screen, like a navigation view. */
const WALK_RESOLUTION = 1.5

/** Below this width the panel is a bottom sheet (keep in step with `@media (max-width: 719px)` in index.css). */
const SHEET_QUERY = '(max-width: 719px)'

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type LayersMeta = {
  dtm: string
  extent: [number, number, number, number]
  slope_classes: { min_deg: number; rgba: [number, number, number, number] }[]
}

type RouteFeature = { geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }
type RouteCollection = { properties: Record<string, unknown>; features: RouteFeature[] }

type Stop = { order: number; name: string; why: string; sourceUrl: string }

type Summary = {
  lengthM: number
  maxSlopeDeg: number
  climbM: number
  descentM: number
  stops: Stop[]
  sample: boolean
  slopeLimitDeg: number
  slopeClasses: LayersMeta['slope_classes']
  dtm: string
}

function css(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}

/** Route line (soft glow, dark casing, accent core, all with round joins) plus an icon badge per stop; the selected
 * stop swaps to the accent fill (same swap as the stop list). */
function routeStyles(selected: { current: number | null }): (f: FeatureLike) => Style | Style[] {
  const route = css('--route')
  const casing = css('--route-casing')
  const fill = css('--stop-fill')
  const ink = css('--stop-ink')
  const stroke = (color: string, width: number) => new Stroke({ color, width, lineCap: 'round', lineJoin: 'round' })
  const line = [
    new Style({ stroke: stroke(withAlpha(route, 0.22), 15) }),
    new Style({ stroke: stroke(withAlpha(casing, 0.85), 7.5) }),
    new Style({ stroke: stroke(route, 3.5) }),
  ]
  // The base sits at stop 1: a small habitat badge tucked against that stop's top-left.
  const base = new Style({
    zIndex: 3,
    image: new Icon({ src: badgeSvg(BASE_ICON, { size: 24, fill: '#ffffff', ring: casing, ink: casing }), displacement: [-18, 18] }),
  })
  const stops: Record<string, Style> = {} // OpenLayers' Map shadows the built-in Map in this file
  return (f) => {
    if (f.get('role') === 'route') return line
    if (f.get('role') === 'base') return base
    const on = f.get('order') === selected.current
    const key = `${f.get('name')}|${on}`
    let style = stops[key]
    if (!style) {
      const src = badgeSvg(stopIcon(String(f.get('name'))), {
        size: on ? 38 : 32,
        fill: on ? route : fill,
        ring: on ? fill : route,
        ink: on ? fill : ink,
      })
      style = new Style({ zIndex: on ? 2 : 1, image: new Icon({ src }) })
      stops[key] = style
    }
    return style
  }
}

/** Simulated astronaut position from the walk view: a hollow white ring with a dark edge, wide enough to
 * circle a stop marker, so the stop's number stays readable when the walker stands on it. */
function walkerStyle(): Style[] {
  const ring = (color: string, width: number) =>
    new Style({ image: new Circle({ radius: 16, stroke: new Stroke({ color, width }) }) })
  return [ring(css('--route-casing'), 7), ring('#ffffff', 3.5)]
}

type MapViewProps = {
  /** Simulated astronaut position from the walk view; null hides the walker. */
  walker?: LonLat | null
  mode: Mode
  onModeChange: (m: Mode) => void
  /** Shown under the route plan in Plan mode (the conditions). */
  planExtra?: ReactNode
  /** The walk view, shown in Walk mode; kept mounted in Plan mode so the walk keeps its place. */
  walkPanel?: ReactNode
}

export default function MapView({ walker = null, mode, onModeChange, planExtra, walkPanel }: MapViewProps) {
  const target = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const mapRef = useRef<Map | null>(null)
  const routeLayer = useRef<VectorLayer | null>(null)
  const walkerLayer = useRef<VectorLayer | null>(null)
  const routeExtent = useRef<number[] | null>(null)
  const { theme } = useTheme()
  // Walk mode follows the walker until the user drags the map; the button re-locks it.
  const [follow, setFollow] = useState(true)
  const followRef = useRef(true)
  const modeRef = useRef(mode)
  const walkerRef = useRef(walker)
  const fitted = useRef(false)
  const toggleable = useRef<Partial<Record<LayerKey, { setVisible: (on: boolean) => void }>>>({})
  const [layersOn, setLayersOn] = useState(ALL_LAYERS_ON)
  const t = useT()
  const [walkerFeature] = useState(() => new Feature<Point>()) // created once, not on every render
  const selectedRef = useRef<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let map: Map | undefined
    let cancelled = false

    Promise.all([
      getJson<LayersMeta>('/data/layers.json'),
      getJson<RouteCollection>('/data/route.geojson'),
    ])
      .then(([layers, route]) => {
        if (cancelled || !target.current) return
        const imageLayer = (url: string, opacity = 1) =>
          new ImageLayer({
            opacity,
            source: new ImageStatic({ url, projection: EQC, imageExtent: layers.extent, interpolate: true }),
          })
        const routeSource = new VectorSource({
          features: new GeoJSON({ dataProjection: LONLAT, featureProjection: EQC }).readFeatures(route),
        })
        // Draw the route smoothed; the computed geometry stays in route.geojson for lengths and the walker.
        for (const f of routeSource.getFeatures()) {
          if (f.get('role') === 'route') {
            const g = f.getGeometry() as LineString
            g.setCoordinates(smoothLine(g.getCoordinates()))
          }
        }
        const vector = new VectorLayer({ source: routeSource, style: routeStyles(selectedRef) })
        const terrain = imageLayer('/data/hillshade.png')
        const slope = imageLayer('/data/slope.png', 0.85)
        toggleable.current = { terrain, slope, route: vector }
        const walkerVector = new VectorLayer({ source: new VectorSource({ features: [walkerFeature] }), style: walkerStyle() })
        map = new Map({
          target: target.current,
          controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]),
          layers: [terrain, slope, vector, walkerVector],
          view: new View({ projection: EQC, extent: layers.extent, constrainOnlyCenter: true, maxZoom: 22 }),
        })
        walkerLayer.current = walkerVector
        routeExtent.current = routeSource.getExtent() ?? layers.extent
        // The first view is set once the panel has its content (see the mode effect), so the route clears it.
        map.getView().fit(routeExtent.current, { padding: [48, 48, 48, 48] })
        map.on('pointerdrag', () => {
          if (modeRef.current === 'walk' && followRef.current) {
            followRef.current = false
            setFollow(false)
          }
        })

        const stopAt = (pixel: number[]) =>
          map!.forEachFeatureAtPixel(pixel, (f) => (f.get('role') === 'stop' ? f : undefined), { hitTolerance: 6 })
        map.on('click', (e) => {
          const f = stopAt(e.pixel)
          setSelected(f ? (f.get('order') as number) : null)
        })
        map.on('pointermove', (e) => {
          if (!e.dragging) target.current!.style.cursor = stopAt(e.pixel) ? 'pointer' : ''
        })
        mapRef.current = map
        routeLayer.current = vector

        const line = route.features.find((f) => f.properties.role === 'route')!
        const p = line.properties
        setSummary({
          lengthM: routeLengthM(line.geometry.coordinates as LonLat[]),
          maxSlopeDeg: Number(p.max_slope_deg),
          climbM: Number(p.climb_m),
          descentM: Number(p.descent_m),
          stops: route.features
            .filter((f) => f.properties.role === 'stop')
            .map((f) => ({
              order: Number(f.properties.order),
              name: String(f.properties.name),
              why: String(f.properties.why_habitability ?? ''),
              sourceUrl: safeHttpUrl(String(f.properties.source_url ?? '')) ?? '',
            }))
            .sort((a, b) => a.order - b.order),
          sample: route.properties.sample === true,
          slopeLimitDeg: Number(route.properties.slope_limit_deg),
          slopeClasses: layers.slope_classes,
          dtm: layers.dtm,
        })
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })

    return () => {
      cancelled = true
      map?.setTarget(undefined)
      mapRef.current = null
      routeLayer.current = null
      walkerLayer.current = null
      toggleable.current = {}
    }
  }, [walkerFeature]) // stable (created once), so the map is still built only once

  // Apply the layer switches; `summary` is set once the layers exist, so the first pass sees them too.
  useEffect(() => {
    for (const { key } of MAP_LAYERS) toggleable.current[key]?.setVisible(layersOn[key])
  }, [layersOn, summary])

  // OpenLayers builds its control buttons once with English tooltips; keep them in the UI language.
  useEffect(() => {
    const tips: [string, string][] = [
      ['.ol-zoom-in', 'Zoom in'],
      ['.ol-zoom-out', 'Zoom out'],
      ['.ol-rotate-reset', 'Reset rotation'],
      ['.ol-attribution button', 'Attributions'],
    ]
    for (const [sel, en] of tips) target.current?.querySelector(sel)?.setAttribute('title', t(en))
  }, [t, summary])

  /** Where the panel leaves the map uncovered: beside it on wide screens, above it when it is a bottom sheet. */
  function freeArea(map: Map): { padding: number[]; center: [number, number] } | null {
    const size = map.getSize()
    const panel = panelRef.current
    if (!size || !target.current) return null
    const [w, h] = size
    if (!panel) return { padding: [48, 48, 48, 48], center: [w / 2, h / 2] }
    const p = panel.getBoundingClientRect()
    const m = target.current.getBoundingClientRect()
    // Same breakpoint as the bottom-sheet CSS; the panel's width alone misreads 720-800 px windows.
    if (!window.matchMedia(SHEET_QUERY).matches) {
      const right = p.right - m.left
      return { padding: [48, 48, 48, right + 24], center: [(right + w) / 2, h / 2] }
    }
    const top = p.top - m.top
    return { padding: [48, 48, h - top + 24, 48], center: [w / 2, top / 2] }
  }

  /** The view centre that puts `coord` at the middle of the uncovered area at resolution `res`. */
  function centerFor(map: Map, coord: number[], res: number): number[] | null {
    const area = freeArea(map)
    const size = map.getSize()
    if (!area || !size) return null
    return [coord[0] + (size[0] / 2 - area.center[0]) * res, coord[1] - (size[1] / 2 - area.center[1]) * res]
  }

  function goToWalker(animate: boolean, res?: number) {
    const map = mapRef.current
    const at = walkerRef.current && transform(walkerRef.current, LONLAT, EQC)
    if (!map || !at) return
    const view = map.getView()
    const resolution = res ?? view.getResolution() ?? WALK_RESOLUTION
    const center = centerFor(map, at, resolution)
    if (!center) return
    if (animate && !reducedMotion()) view.animate({ center, resolution, duration: 550 })
    else {
      view.setResolution(resolution)
      view.setCenter(center)
    }
  }

  // Plan mode shows the whole route beside the panel; Walk mode zooms in on the walker and follows it.
  useEffect(() => {
    modeRef.current = mode
    const map = mapRef.current
    if (!map || !summary || !routeExtent.current) return
    const animate = fitted.current && !reducedMotion()
    fitted.current = true
    // Wait one frame so the panel has its new width before measuring what it covers.
    const id = requestAnimationFrame(() => {
      map.updateSize()
      if (mode === 'plan') {
        const area = freeArea(map)
        map.getView().fit(routeExtent.current!, { padding: area?.padding, duration: animate ? 550 : 0 })
      } else {
        followRef.current = true
        setFollow(true)
        goToWalker(animate, WALK_RESOLUTION)
      }
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers read refs only
  }, [mode, summary])

  useEffect(() => {
    walkerRef.current = walker
    walkerFeature.setGeometry(walker ? new Point(transform(walker, LONLAT, EQC)) : undefined)
    const view = mapRef.current?.getView()
    if (mode === 'walk' && followRef.current && view && !view.getAnimating()) goToWalker(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers read refs only
  }, [walker, walkerFeature])

  const relock = () => {
    followRef.current = true
    setFollow(true)
    goToWalker(true)
  }

  // Map markers are drawn with colours read from the CSS theme; redraw them when the theme changes.
  useEffect(() => {
    routeLayer.current?.setStyle(routeStyles(selectedRef))
    walkerLayer.current?.setStyle(walkerStyle())
  }, [theme])

  // Redraw the stop highlight and bring the selected stop into view if it is off screen.
  useEffect(() => {
    selectedRef.current = selected
    routeLayer.current?.changed()
    const map = mapRef.current
    if (selected === null || !map) return
    const f = routeLayer.current
      ?.getSource()
      ?.getFeatures()
      .find((x) => x.get('role') === 'stop' && x.get('order') === selected)
    const at = (f?.getGeometry() as Point | undefined)?.getCoordinates()
    const size = map.getSize()
    const px = at && map.getPixelFromCoordinate(at)
    if (!at || !size || !px) return
    const visible = px[0] > 0 && px[1] > 0 && px[0] < size[0] && px[1] < size[1]
    if (!visible) map.getView().animate({ center: at, duration: reducedMotion() ? 0 : 550 })
  }, [selected])

  return (
    <div className="map-shell">
      <div ref={target} className="map" role="region" aria-label={t('Map of the walking route')} />
      {mode === 'walk' && !follow && (
        <button type="button" className="recenter" onClick={relock}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="7.5" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
          </svg>
          {t('Follow the walker')}
        </button>
      )}
      <aside ref={panelRef} className="panel" data-mode={mode} aria-label={t('Route summary')}>
        <div className="panel-title">
          <h1>RotaRovers Martian Map</h1>
          <LangSwitch />
        </div>
        <p className="muted">{t('Planned Marswalk in Gale crater, on its central mound (Mount Sharp)')}</p>
        <div className="panel-bar">
          <div className="seg seg--mode" role="group" aria-label={t('Mode')}>
            {(['plan', 'walk'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => onModeChange(m)}>
                {m === 'plan' ? t('Plan') : t('Walk')}
              </button>
            ))}
          </div>
          <ThemeSwitch />
        </div>
        {error && <p className="error">{t('Could not load map data: {error}', { error })}</p>}
        <div className="panel-body" hidden={mode !== 'walk'}>
          {walkPanel}
        </div>
        {summary && (
          <div className="panel-body" hidden={mode !== 'plan'}>
            {summary.sample && (
              <p className="badge">{t('Placeholder stops: route is computed, stops are not science stops yet')}</p>
            )}
            <dl className="stats">
              <dt>{t('Round trip')}</dt>
              <dd>{(summary.lengthM / 1000).toFixed(2)} km</dd>
              <dt>{t('Steepest point (5 m grid)')}</dt>
              <dd>{summary.maxSlopeDeg.toFixed(1)}°</dd>
              <dt>{t('Climb / descent')}</dt>
              <dd>
                {Math.round(summary.climbM)} / {Math.round(summary.descentM)} m
              </dd>
            </dl>
            <h2 className="section">{t('Science stops')}</h2>
            <ol className="stops">
              {summary.stops.map((s) => {
                const open = s.order === selected
                return (
                  <li key={s.order} className={open ? 'open' : undefined}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setSelected(open ? null : s.order)}
                    >
                      <span className="num" aria-label={t('Stop {n}', { n: s.order })}>
                        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={stopIcon(s.name)} />
                        </svg>
                      </span>
                      <span>{t(s.name)}</span>
                    </button>
                    {open && (s.why || s.sourceUrl) && (
                      <div className="stop-detail">
                        {s.why && <p>{t(s.why)}</p>}
                        {s.sourceUrl && (
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">
                            {t('Source: {host}', { host: hostOf(s.sourceUrl) })}
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            <h2 className="section">{t('Map layers')}</h2>
            <ul className="legend layer-toggles">
              {MAP_LAYERS.map((l) => (
                <li key={l.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={layersOn[l.key]}
                      onChange={(e) => setLayersOn((v) => setLayer(v, l.key, e.target.checked))}
                    />
                    {t(l.label)}
                  </label>
                </li>
              ))}
            </ul>
            <ul className="legend">
              <li>
                <span className="swatch line" /> {t('Route avoiding slopes over {deg}°, out and back', { deg: summary.slopeLimitDeg })}
              </li>
              <li>
                <span className="swatch base">
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={BASE_ICON} />
                  </svg>
                </span>{' '}
                {t('Base: start and end, at stop 1')}
              </li>
              {summary.slopeClasses.map((c, i) => {
                const next = summary.slopeClasses[i + 1]
                const [r, g, b, a] = c.rgba
                return (
                  <li key={c.min_deg}>
                    <span className="swatch" style={{ background: `rgba(${r}, ${g}, ${b}, ${a / 255})` }} />
                    {next
                      ? t('Slope {from}–{to}°', { from: c.min_deg, to: next.min_deg })
                      : t('Slope over {from}°: no-go', { from: c.min_deg })}
                  </li>
                )
              })}
            </ul>
            <p className="credit">
              {t(
                'Elevation and slope: HiRISE DTM {dtm} (NASA/JPL/University of Arizona, via USGS Astrogeology), 5 m grid.',
                { dtm: summary.dtm },
              )}
            </p>
            {planExtra}
          </div>
        )}
      </aside>
    </div>
  )
}
