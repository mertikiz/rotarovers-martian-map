import { useEffect, useState } from 'react'
import { DEFAULT_WALK_SPEED_KMH, DEFAULT_WALK_SPEED_MPS, formatDuration } from './walkUtils.ts'
import { getJson, safeHttpUrl } from './url.ts'

type Conditions = {
  generated_utc: string
  disclaimer: string
  rems: {
    sol: number
    earth_date: string
    air_temp_min_c: number
    air_temp_max_c: number
    ground_temp_min_c: number | null
    ground_temp_max_c: number | null
    pressure_pa: number | null
    sky: string | null
    uv_index: string | null
    sunrise_local: string | null
    sunset_local: string | null
    distance_to_base_km: number
    source_url: string
    note: string
  }
  insight: {
    sol: number
    first_utc: string
    air_temp_min_c: number
    air_temp_max_c: number
    wind_avg_mps: number
    wind_max_mps: number
    pressure_avg_pa: number
    distance_to_base_km: number
    source_url: string
  }
  rad: { dose_equivalent_msv_per_day: number; period: string; what: string; source_url: string }
}

const deg = (c: number) => `${Math.round(c) < 0 ? '−' : ''}${Math.abs(Math.round(c))} °C` // true minus sign
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function minutes(hhmm: string | null): number | null {
  const m = hhmm?.match(/^(\d{1,2}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function Source({ url, label }: { url: string; label: string }) {
  const safe = safeHttpUrl(url)
  return safe ? (
    <a className="cond-source" href={safe} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : null
}

/** Latest available surface conditions (static, dated file from pipeline/conditions.py), with the walk's own
 *  time and radiation estimate at the assumed walking speed. */
export default function ConditionsPanel() {
  const [cond, setCond] = useState<Conditions | null>(null)
  const [walkM, setWalkM] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getJson<Conditions>('/data/conditions.json'),
      getJson<{ features: { properties: { role: string; length_m?: number } }[] }>('/data/route.geojson'),
    ])
      .then(([c, route]) => {
        if (cancelled) return
        setCond(c)
        const line = route.features.find((f) => f.properties.role === 'route')
        setWalkM(Number(line?.properties.length_m) || null)
      })
      .catch((e: unknown) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <section className="cond" role="alert">Could not load conditions: {error}</section>
  if (!cond) return null

  const { rems, insight, rad } = cond
  const walkSec = walkM ? walkM / DEFAULT_WALK_SPEED_MPS : null
  const rise = minutes(rems.sunrise_local)
  const set = minutes(rems.sunset_local)
  // Whole hours only: the feed's clock is not stated, and a Mars hour is ~3 % longer than an Earth hour.
  const daylightHours = rise !== null && set !== null ? Math.round((set - rise) / 60) : null
  const walkDose = walkSec ? (rad.dose_equivalent_msv_per_day * walkSec) / 86400 : null

  return (
    <section className="cond" aria-labelledby="cond-title">
      <header className="cond-head">
        <h2 id="cond-title">Conditions</h2>
        <p>{cond.disclaimer}</p>
      </header>
      <div className="cond-grid">
        <article className="cond-card">
          <h3>Weather at Gale crater</h3>
          <p className="cond-when">
            Curiosity REMS · sol {rems.sol} · {day(rems.earth_date)} · {rems.distance_to_base_km} km from the base
          </p>
          <dl>
            <dt>Air</dt>
            <dd>
              {deg(rems.air_temp_min_c)} to {deg(rems.air_temp_max_c)}
            </dd>
            {rems.ground_temp_min_c !== null && rems.ground_temp_max_c !== null && (
              <>
                <dt>Ground</dt>
                <dd>
                  {deg(rems.ground_temp_min_c)} to {deg(rems.ground_temp_max_c)}
                </dd>
              </>
            )}
            {rems.pressure_pa !== null && (
              <>
                <dt>Pressure</dt>
                <dd>{Math.round(rems.pressure_pa)} Pa</dd>
              </>
            )}
            {rems.uv_index && (
              <>
                <dt>UV</dt>
                <dd>{rems.uv_index}</dd>
              </>
            )}
            {rems.sunrise_local && rems.sunset_local && (
              <>
                <dt>Sunrise–sunset</dt>
                <dd>
                  {rems.sunrise_local}–{rems.sunset_local}
                </dd>
              </>
            )}
          </dl>
          {walkSec && daylightHours && (
            <p className="cond-walk">
              The walk takes about {formatDuration(walkSec)} at the assumed {DEFAULT_WALK_SPEED_KMH} km/h,{' '}
              {walkSec / 3600 <= daylightHours / 2
                ? 'well inside'
                : walkSec / 3600 <= daylightHours
                  ? 'inside'
                  : 'longer than'}{' '}
              the roughly {daylightHours}-hour sunrise-to-sunset window.
            </p>
          )}
          <p className="cond-note">
            {rems.note} Sunrise and sunset are shown as the feed gives them; it does not state which Mars clock it uses.
          </p>
          <Source url={rems.source_url} label="Source: REMS weather feed (CAB / NASA)" />
        </article>

        <article className="cond-card">
          <h3>Wind</h3>
          <p className="cond-when">
            InSight · sol {insight.sol} · {day(insight.first_utc)} · {Math.round(insight.distance_to_base_km)} km away,
            Elysium Planitia
          </p>
          <dl>
            <dt>Average</dt>
            <dd>{insight.wind_avg_mps.toFixed(1)} m/s</dd>
            <dt>Highest</dt>
            <dd>{insight.wind_max_mps.toFixed(1)} m/s</dd>
            <dt>Air</dt>
            <dd>
              {deg(insight.air_temp_min_c)} to {deg(insight.air_temp_max_c)}
            </dd>
            <dt>Pressure</dt>
            <dd>{Math.round(insight.pressure_avg_pa)} Pa</dd>
          </dl>
          <p className="cond-note">
            Curiosity's feed reports no wind, so this is the nearest published wind record: another site, from 2020.
          </p>
          <Source url={insight.source_url} label="Source: InSight weather service (NASA)" />
        </article>

        <article className="cond-card">
          <h3>Radiation</h3>
          <p className="cond-when">Curiosity RAD · {rad.period} · Gale crater</p>
          <dl>
            <dt>Average dose</dt>
            <dd>{rad.dose_equivalent_msv_per_day} mSv/day</dd>
            {walkDose !== null && (
              <>
                <dt>This walk</dt>
                <dd>≈ {walkDose.toFixed(2)} mSv</dd>
              </>
            )}
          </dl>
          <p className="cond-note">
            {rad.what} The walk figure applies that average to the walk time; it is not a measurement.
          </p>
          <Source url={rad.source_url} label="Source: SwRI, Hassler et al. (Science, 2014)" />
        </article>
      </div>
    </section>
  )
}
