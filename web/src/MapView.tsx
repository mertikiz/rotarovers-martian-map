import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import ImageLayer from 'ol/layer/Image.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style.js'
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

/** Route line plus numbered stops; the selected stop swaps to the accent fill (same swap as the stop list). */
function routeStyles(selected: { current: number | null }): (f: FeatureLike) => Style | Style[] {
  const casing = new Style({ stroke: new Stroke({ color: css('--route-casing'), width: 7 }) })
  const line = new Style({ stroke: new Stroke({ color: css('--route'), width: 3.5 }) })
  const base = new Style({
    zIndex: 0,
    image: new RegularShape({
      points: 4,
      radius: 21, // a square frame around stop 1's circle
      angle: Math.PI / 4,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: css('--route-casing'), width: 2.5 }),
    }),
    text: new Text({ text: 'B', font: '700 12px system-ui, sans-serif', offsetX: -20, offsetY: -14,
      fill: new Fill({ color: '#ffffff' }), stroke: new Stroke({ color: css('--route-casing'), width: 3 }) }),
  })
  return (f) => {
    if (f.get('role') === 'route') return [casing, line]
    if (f.get('role') === 'base') return base
    const on = f.get('order') === selected.current
    return new Style({
      zIndex: on ? 2 : 1,
      image: new Circle({
        radius: on ? 14 : 11,
        fill: new Fill({ color: css(on ? '--route' : '--stop-fill') }),
        stroke: new Stroke({ color: css(on ? '--stop-fill' : '--route'), width: 2.5 }),
      }),
      text: new Text({
        text: String(f.get('order')),
        font: '600 12px system-ui, sans-serif',
        fill: new Fill({ color: css(on ? '--stop-fill' : '--stop-ink') }),
      }),
    })
  }
}

/** Simulated astronaut position from the walk view: a hollow white ring with a dark edge, wide enough to
 * circle a stop marker, so the stop's number stays readable when the walker stands on it. */
function walkerStyle(): Style[] {
  const ring = (color: string, width: number) =>
    new Style({ image: new Circle({ radius: 16, stroke: new Stroke({ color, width }) }) })
  return [ring(css('--route-casing'), 7), ring('#ffffff', 3.5)]
}

export default function MapView({ walker = null }: { walker?: LonLat | null }) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const routeLayer = useRef<VectorLayer | null>(null)
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
        const vector = new VectorLayer({ source: routeSource, style: routeStyles(selectedRef) })
        const terrain = imageLayer('/data/hillshade.png')
        const slope = imageLayer('/data/slope.png', 0.85)
        toggleable.current = { terrain, slope, route: vector }
        map = new Map({
          target: target.current,
          controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]),
          layers: [
            terrain,
            slope,
            vector,
            new VectorLayer({ source: new VectorSource({ features: [walkerFeature] }), style: walkerStyle() }),
          ],
          view: new View({ projection: EQC, extent: layers.extent, constrainOnlyCenter: true, maxZoom: 22 }),
        })
        // Keep the route clear of the summary panel when there is room beside it.
        const besidePanel = target.current.clientWidth >= 720 ? 360 : 48
        map.getView().fit(routeSource.getExtent() ?? layers.extent, { padding: [48, 48, 48, besidePanel] })

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

  useEffect(() => {
    walkerFeature.setGeometry(walker ? new Point(transform(walker, LONLAT, EQC)) : undefined)
  }, [walker, walkerFeature])

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
    if (!visible) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      map.getView().animate({ center: at, duration: reduce ? 0 : 550 })
    }
  }, [selected])

  return (
    <div className="map-shell">
      <div ref={target} className="map" role="region" aria-label={t('Map of the walking route')} />
      <aside className="panel" aria-label={t('Route summary')}>
        <div className="panel-title">
          <h1>RotaRovers Martian Map</h1>
          <LangSwitch />
        </div>
        <p className="muted">{t('Planned Marswalk in Gale crater, on its central mound (Mount Sharp)')}</p>
        {error && <p className="error">{t('Could not load map data: {error}', { error })}</p>}
        {summary && (
          <>
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
                      <span className="num">{s.order}</span>
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
                <span className="swatch base" /> {t('Base (B): start and end, at stop 1')}
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
          </>
        )}
      </aside>
    </div>
  )
}
