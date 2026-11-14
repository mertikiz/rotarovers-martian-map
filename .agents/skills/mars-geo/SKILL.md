---
name: mars-geo
description: Use whenever code or data in this project touches Mars coordinates, distances, map projections, the HiRISE DTM, slope, or the route/stop GeoJSON (web/ with OpenLayers + proj4, pipeline/ with rasterio). Prevents Earth defaults (Earth radius, EPSG:3857, Earth basemaps) from silently producing wrong Mars results.
---

# Mars geometry rules for RotaRovers Martian Map

Earth is the default everywhere in mapping libraries. On Mars those defaults give answers that look fine and are wrong.
Apply every rule below; if a task seems to need breaking one, stop and ask the user.

## Reference values (read from the DTM file itself, 2026-11-14)
| Item | Value |
|---|---|
| Study DTM | `DTEEC_006855_1750_007501_1750_A01` (HiRISE, USGS STAC `mro_hirise_socet_dtms`) |
| DTM URL | `https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_006855_1750_PSP_007501_1750/DTEEC_006855_1750_007501_1750_A01.tif` (cloud-optimized; read parts over HTTP with `/vsicurl/`) |
| DTM projection (proj4) | `+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs` |
| Mars radius for all distances | **3,396,190 m** (the sphere the DTM uses) |
| Footprint (lon, lat) | **137.1716 to 137.2895 °E, −5.2217 to −4.9504 °** |
| Pixel size | ~1.012 m |
| NoData | `-3.4028226550889045e+38` (float32). Always read masked; never treat it as an elevation |
| Elevation range | about −4044 m to −2416 m |

## Coordinates
- GeoJSON order is **[longitude, latitude]** in degrees. Longitude is **east-positive, −180…180**; latitude is
  planetocentric. Never swap them; never use 0…360 in the data files.
- Every stop and route point must lie inside the footprint above. Reject or flag anything outside it.

## Web (OpenLayers + proj4)
- Register the DTM projection under a project code, e.g.:
  ```ts
  import proj4 from 'proj4'
  import { register } from 'ol/proj/proj4'
  proj4.defs('MARS2015:EQC', '+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs')
  proj4.defs('MARS2015:LONLAT', '+proj=longlat +R=3396190 +no_defs')
  register(proj4)
  ```
- **Never** use `EPSG:3857`, `EPSG:4326` or OSM/Google/Earth tile layers for this map.
- `ol/sphere` uses Earth's radius by default (`DEFAULT_RADIUS = 6371008.8`, checked in ol 10.11). Always pass Mars':
  ```ts
  import { getDistance } from 'ol/sphere'
  const MARS_RADIUS_M = 3396190
  const metres = getDistance([lon1, lat1], [lon2, lat2], MARS_RADIUS_M) // [lon, lat] in degrees
  ```
  For a route, sum `getDistance` over consecutive points. Do not call `getLength` without `{ radius: MARS_RADIUS_M }`
  and the right projection.

## Pipeline (Python)
- Open the DTM with rasterio, masked: `ds.read(1, masked=True)`. Take the pixel size from `ds.res` / `ds.transform`,
  never assume 1 m.
- Slope in degrees: `np.degrees(np.arctan(np.hypot(dz/dx, dz/dy)))` with dx, dy in metres (the DTM's metres).
- Walkable limit: **20°** (a working planning value from NASA lunar EVA planning, not a Mars requirement). Cells
  steeper than 20° or NoData are **impassable**, not merely expensive; diagonal moves must not cut the corner of an
  impassable cell.
- Convert pixel → projected metres with `ds.transform`, then metres → lon/lat with the `+proj=longlat +R=3396190`
  definition (pyproj or rasterio.warp), so the GeoJSON matches the web map.

## Checks before saying "done"
1. A known point lands in the right place on the map (e.g. a footprint corner).
2. Every route point is inside the footprint; the maximum slope along the route is < 20°.
3. Route length computed in Python and in the web app agree (both with the Mars radius).
4. Sample data stays labelled `"sample": true`; real data never is.
