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
import { Circle, Fill, Stroke, Style, Text } from 'ol/style.js'
import type { FeatureLike } from 'ol/Feature.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { transform } from 'ol/proj.js'
import 'ol/ol.css'
import { EQC, LONLAT } from './mars.ts'
import { routeLengthM, type LonLat } from './geo.ts'
import { safeHttpUrl } from './url.ts'

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
  return (f) => {
    if (f.get('role') === 'route') return [casing, line]
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

/** Simulated astronaut position from the walk view: a white dot ringed in the route casing colour. */
function walkerStyle(): Style {
  return new Style({
    zIndex: 3,
    image: new Circle({
      radius: 8,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: css('--route-casing'), width: 3 }),
    }),
  })
}

export default function MapView({ walker = null }: { walker?: LonLat | null }) {
  const target = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const routeLayer = useRef<VectorLayer | null>(null)
  const walkerFeature = useRef(new Feature<Point>())
  const selectedRef = useRef<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let map: Map | undefined
    let cancelled = false

    Promise.all([
      fetch('/data/layers.json').then((r) => r.json() as Promise<LayersMeta>),
      fetch('/data/route.geojson').then((r) => r.json() as Promise<RouteCollection>),
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
        map = new Map({
          target: target.current,
          controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]),
          layers: [
            imageLayer('/data/hillshade.png'),
            imageLayer('/data/slope.png', 0.85),
            vector,
            new VectorLayer({ source: new VectorSource({ features: [walkerFeature.current] }), style: walkerStyle() }),
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
    }
  }, [])

  useEffect(() => {
    walkerFeature.current.setGeometry(walker ? new Point(transform(walker, LONLAT, EQC)) : undefined)
  }, [walker])

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
      <div ref={target} className="map" />
      <aside className="panel" aria-label="Route summary">
        <h1>RotaRovers Martian Map</h1>
        <p className="muted">Planned Marswalk south of Gale crater</p>
        {error && <p className="error">Could not load map data: {error}</p>}
        {summary && (
          <>
            {summary.sample && (
              <p className="badge">Placeholder stops: route is computed, stops are not science stops yet</p>
            )}
            <dl className="stats">
              <dt>Distance</dt>
              <dd>{(summary.lengthM / 1000).toFixed(2)} km</dd>
              <dt>Steepest point</dt>
              <dd>{summary.maxSlopeDeg.toFixed(1)}°</dd>
              <dt>Climb / descent</dt>
              <dd>
                {Math.round(summary.climbM)} / {Math.round(summary.descentM)} m
              </dd>
            </dl>
            <h2 className="section">Science stops</h2>
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
                      <span>{s.name}</span>
                    </button>
                    {open && (s.why || s.sourceUrl) && (
                      <div className="stop-detail">
                        {s.why && <p>{s.why}</p>}
                        {s.sourceUrl && (
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">
                            Source: {hostOf(s.sourceUrl)}
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            <ul className="legend">
              <li>
                <span className="swatch line" /> Route avoiding slopes over {summary.slopeLimitDeg}°
              </li>
              {summary.slopeClasses.map((c, i) => {
                const next = summary.slopeClasses[i + 1]
                const [r, g, b, a] = c.rgba
                return (
                  <li key={c.min_deg}>
                    <span className="swatch" style={{ background: `rgba(${r}, ${g}, ${b}, ${a / 255})` }} />
                    {next ? `Slope ${c.min_deg}–${next.min_deg}°` : `Slope over ${c.min_deg}°: no-go`}
                  </li>
                )
              })}
            </ul>
            <p className="credit">
              Elevation and slope: HiRISE DTM {summary.dtm} (NASA/JPL/University of Arizona, via USGS
              Astrogeology), 5 m grid.
            </p>
          </>
        )}
      </aside>
    </div>
  )
}
