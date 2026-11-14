# Data formats (shared by the pipeline and the web app)

Coordinates everywhere: **[longitude, latitude] in degrees**, longitude **east-positive, −180…180**, planetocentric
latitude (Mars 2015 sphere, radius 3,396,190 m). Use the Mars radius for distances, never Earth's.

Study area: HiRISE DTM `DTEEC_006855_1750_007501_1750_A01`, footprint about **137.17–137.29°E, 5.22–4.95°S**.
Every stop and route point must be inside it.

## `content/stops.csv`
Science stops for past habitability and water, filled in by hand from sources.

| Column | Meaning |
|---|---|
| `order` | Visit order (1, 2, 3, …) |
| `name` | Short name (English) |
| `lon_e`, `lat` | Degrees, as above |
| `why_habitability` | 2–3 sentences (English): what this spot can tell us about past water or habitability |
| `source_url` | Link to the source (paper, NASA/USGS page, HiRISE image page) |
| `notes` | Optional |

## Route GeoJSON (`web/public/...`)
A `FeatureCollection` with one `LineString` feature (`properties.role = "route"`) and one `Point` feature per stop
(`properties.role = "stop"`, `order`, `name`). `web/public/sample/route-sample.geojson` is **sample data** for
development; the real route is produced by the pipeline.

**Computed route:** `web/public/data/route.geojson`, written by `python pipeline/route.py` (the app loads it from
`/data/route.geojson`). Same shape as above, plus:
- route: `length_m` (Mars radius), `max_slope_deg`, `climb_m`, `descent_m`; about one point every 5–7 m
- stop: `snapped_m` (how far the stop was moved onto walkable ground, at most 50 m)
- collection: `dtm`, `cell_m`, `slope_limit_deg`, `note`

While `content/stops.csv` is empty the pipeline uses `pipeline/placeholder_stops.csv`, and the file is marked
`"sample": true`. All stops must lie in **one connected walkable area**: a steep ridge splits the footprint, and the
pipeline stops with an error if two stops are on different sides of it.
