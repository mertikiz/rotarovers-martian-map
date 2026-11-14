"""Least-cost walking route over the HiRISE DTM, avoiding slopes steeper than the walkable limit.

Usage (from the repo root, inside the venv):
    python pipeline/route.py                      # stops from content/stops.csv, else labelled placeholders
    python pipeline/route.py --cell 5 --limit 20  # metres per cell, max walkable slope in degrees

Writes web/public/data/route.geojson. The downsampled DTM is cached in data/ (git-ignored).
"""
import argparse
import csv
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from pyproj import Transformer
from scipy import ndimage
from skimage.graph import MCP_Geometric

ROOT = Path(__file__).resolve().parent.parent
DTM_ID = "DTEEC_006855_1750_007501_1750_A01"
DTM_URL = ("https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/"
           "PSP_006855_1750_PSP_007501_1750/" + DTM_ID + ".tif")
MARS_RADIUS_M = 3396190.0
EQC = "+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs"
LONLAT = "+proj=longlat +R=3396190 +no_defs"
FOOTPRINT = (137.1716, -5.2217, 137.2895, -4.9504)  # lon_min, lat_min, lon_max, lat_max
SNAP_MAX_M = 50.0  # a stop on steep ground is moved to the nearest walkable cell, at most this far
MIN_AREA_M2 = 50_000.0  # walkable islands smaller than this (0.05 km2) are ignored

TO_LONLAT = Transformer.from_crs(EQC, LONLAT, always_xy=True)
TO_EQC = Transformer.from_crs(LONLAT, EQC, always_xy=True)


def load_grid(cell_m: float):
    """Elevation grid (float64, NaN = NoData) at about cell_m metres, cached as GeoTIFF in data/."""
    cache = ROOT / "data" / f"{DTM_ID}_{cell_m:g}m.tif"
    if not cache.exists():
        cache.parent.mkdir(exist_ok=True)
        with rasterio.open("/vsicurl/" + DTM_URL) as ds:
            f = max(1, int(round(cell_m / ds.res[0])))
            shape = (ds.height // f, ds.width // f)
            z = ds.read(1, out_shape=shape, resampling=Resampling.average, masked=True)
            transform = ds.transform * ds.transform.scale(ds.width / shape[1], ds.height / shape[0])
            profile = dict(driver="GTiff", width=shape[1], height=shape[0], count=1, dtype="float32",
                           crs=ds.crs, transform=transform, nodata=np.nan, compress="deflate")
        with rasterio.open(cache, "w", **profile) as out:
            out.write(np.ma.filled(z.astype("float32"), np.nan), 1)
    with rasterio.open(cache) as ds:
        return ds.read(1).astype("float64"), ds.transform


def slope_deg(z, transform):
    """Slope in degrees. East-west spacing is corrected by cos(latitude): the projection keeps
    true scale only on the equator."""
    rows = np.arange(z.shape[0])
    _, y = rasterio.transform.xy(transform, rows, np.zeros_like(rows))
    lat = np.radians(np.asarray(y) / MARS_RADIUS_M)
    dx = abs(transform.a) * np.cos(lat)[:, None]  # metres on the ground, per row
    dy = abs(transform.e)
    gy, gx = np.gradient(z, dy, abs(transform.a))
    gx = gx * abs(transform.a) / dx
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def walkable(slope, limit_deg):
    """Cells that are not NoData, not steeper than the limit and not next to such a cell.
    The 1-cell buffer stops diagonal moves from cutting the corner of a blocked cell."""
    blocked = ~np.isfinite(slope) | (slope > limit_deg)
    return ~ndimage.binary_dilation(blocked, structure=np.ones((3, 3), bool))


def walkable_areas(ok, cell_area_m2):
    """Label connected walkable areas and drop islands smaller than MIN_AREA_M2 (a stop snapped
    onto a tiny flat patch could not be reached anyway). Returns (ok, labels)."""
    labels, _ = ndimage.label(ok, structure=np.ones((3, 3), bool))
    sizes = np.bincount(labels.ravel()) * cell_area_m2
    sizes[0] = 0
    ok = ok & (sizes[labels] >= MIN_AREA_M2)
    return ok, np.where(ok, labels, 0)


def _read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:  # -sig: a CSV saved by Excel starts with a BOM
        rows = [r for r in csv.DictReader(fh) if (r.get("lon_e") or "").strip()]
    rows.sort(key=lambda r: int(r["order"]))
    return [dict(order=int(r["order"]), name=r["name"].strip(), lon=float(r["lon_e"]), lat=float(r["lat"]),
                 why=(r.get("why_habitability") or "").strip(), source_url=(r.get("source_url") or "").strip())
            for r in rows]


def read_stops():
    """Stops from content/stops.csv; while it has no rows, pipeline/placeholder_stops.csv (marked sample)."""
    stops = _read_csv(ROOT / "content" / "stops.csv")
    if stops:
        return stops, False
    return _read_csv(ROOT / "pipeline" / "placeholder_stops.csv"), True


def in_footprint(lon, lat):
    return FOOTPRINT[0] <= lon <= FOOTPRINT[2] and FOOTPRINT[1] <= lat <= FOOTPRINT[3]


def ground_distance_m(lon1, lat1, lon2, lat2):
    """Haversine on the Mars sphere (same formula as ol/sphere getDistance)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * MARS_RADIUS_M * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def stop_cell(x, y, transform, shape, name="stop"):
    """Grid cell of a point in DTM metres. A point outside the grid stops the run with a message; numpy would
    otherwise wrap a negative index to the far side of the grid or raise IndexError at the edge."""
    row, col = (int(v) for v in rasterio.transform.rowcol(transform, x, y))
    if not (0 <= row < shape[0] and 0 <= col < shape[1]):
        raise SystemExit(f"{name} lies on or outside the edge of the DTM grid (row {row}, col {col}).")
    return row, col


def snap(rc, ok, transform, max_m=SNAP_MAX_M):
    """Nearest walkable cell to rc, if within max_m; returns (cell, metres moved)."""
    if ok[rc]:
        return rc, 0.0
    r = int(math.ceil(max_m / abs(transform.a)))
    r0, c0 = max(rc[0] - r, 0), max(rc[1] - r, 0)
    win = ok[r0:rc[0] + r + 1, c0:rc[1] + r + 1]
    cand = np.argwhere(win)
    if cand.size == 0:
        return None, None
    d = np.hypot(cand[:, 0] + r0 - rc[0], cand[:, 1] + c0 - rc[1]) * abs(transform.a)
    i = int(np.argmin(d))
    if d[i] > max_m:
        return None, None
    return (int(cand[i, 0] + r0), int(cand[i, 1] + c0)), float(d[i])


def build_route(cell_m=5.0, limit_deg=20.0, snap_m=SNAP_MAX_M):
    z, transform = load_grid(cell_m)
    slope = slope_deg(z, transform)
    ok, labels = walkable_areas(walkable(slope, limit_deg), abs(transform.a * transform.e))
    stops, is_sample = read_stops()

    cells = []
    for s in stops:
        if not in_footprint(s["lon"], s["lat"]):
            raise SystemExit(f"Stop {s['order']} ({s['name']}) is outside the DTM footprint.")
        x, y = TO_EQC.transform(s["lon"], s["lat"])
        cell, moved = snap(stop_cell(x, y, transform, z.shape, s["name"]), ok, transform, snap_m)
        if cell is None:
            raise SystemExit(f"Stop {s['order']} ({s['name']}): no walkable ground within {snap_m:g} m.")
        s["snapped_m"] = round(moved, 1)
        cells.append(cell)

    # Cost per metre: 1 on flat ground, growing with slope; impassable cells are infinite.
    cost = np.where(ok, 1.0 + (np.nan_to_num(slope) / limit_deg) ** 2, np.inf)
    rows = np.arange(z.shape[0])
    _, y = rasterio.transform.xy(transform, rows, np.zeros_like(rows))
    mid_lat = math.radians(float(np.mean(y)) / MARS_RADIUS_M)
    mcp = MCP_Geometric(cost, fully_connected=True,
                        sampling=(abs(transform.e), abs(transform.a) * math.cos(mid_lat)))
    path = [cells[0]]
    for (sa, a), (sb, b) in zip(zip(stops, cells), zip(stops[1:], cells[1:])):
        if labels[a] != labels[b]:
            raise SystemExit(f"Stops {sa['order']} and {sb['order']} are in separate walkable areas: every way "
                             f"between them crosses ground steeper than {limit_deg:g} deg.")
        mcp.find_costs([a], [b])
        leg = mcp.traceback(b)
        if not leg or tuple(leg[0]) != a:
            raise SystemExit(f"No walkable route between stops {sa['order']} and {sb['order']}.")
        path.extend(tuple(p) for p in leg[1:])
    # Round trip: the base is at the first stop, and the crew walks back along the same safe path.
    outbound_points = len(path)
    path = path + path[-2::-1]

    xs, ys = rasterio.transform.xy(transform, [p[0] for p in path], [p[1] for p in path])
    lons, lats = TO_LONLAT.transform(np.asarray(xs), np.asarray(ys))
    coords = [[round(float(lo), 7), round(float(la), 7)] for lo, la in zip(lons, lats)]
    length = sum(ground_distance_m(*coords[i], *coords[i + 1]) for i in range(len(coords) - 1))
    outbound = sum(ground_distance_m(*coords[i], *coords[i + 1]) for i in range(outbound_points - 1))
    elev = [float(z[p]) for p in path]
    climb = float(np.sum(np.clip(np.diff(elev), 0, None)))
    descent = float(-np.sum(np.clip(np.diff(elev), None, 0)))
    max_slope = float(max(slope[p] for p in path))
    stop_coords = [coords[path.index(c)] for c in cells]

    meta = dict(dtm=DTM_ID, cell_m=round(abs(transform.a), 3), slope_limit_deg=limit_deg,
                note="Slope measured over the grid cell size; cells steeper than the limit, NoData and a 1-cell "
                     "buffer around them are impassable.")
    if is_sample:
        meta.update(sample=True, sample_note="Route computed from the DTM, but the stops are SAMPLE placeholders, "
                                             "not science stops.")
    features = [dict(type="Feature", geometry=dict(type="LineString", coordinates=coords),
                     properties=dict(role="route", length_m=round(length, 1), max_slope_deg=round(max_slope, 2),
                                     climb_m=round(climb, 1), descent_m=round(descent, 1), round_trip=True,
                                     outbound_length_m=round(outbound, 1),
                                     elevation_m=[round(e, 1) for e in elev],  # one per coordinate
                                     **({"sample": True} if is_sample else {})))]
    base = dict(role="base", name="Base: start and end of the walk, at stop 1")
    if is_sample:
        base["sample"] = True
    features.append(dict(type="Feature", geometry=dict(type="Point", coordinates=coords[0]), properties=base))
    for s, c in zip(stops, stop_coords):
        props = dict(role="stop", order=s["order"], name=s["name"], snapped_m=s["snapped_m"],
                     why_habitability=s["why"], source_url=s["source_url"])
        if is_sample:
            props["sample"] = True
        features.append(dict(type="Feature", geometry=dict(type="Point", coordinates=c), properties=props))
    return dict(type="FeatureCollection", properties=meta, features=features)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--cell", type=float, default=5.0, help="grid cell size in metres (default 5)")
    ap.add_argument("--limit", type=float, default=20.0, help="max walkable slope in degrees (default 20)")
    ap.add_argument("--snap", type=float, default=SNAP_MAX_M,
                    help=f"max metres a stop may be moved onto walkable ground (default {SNAP_MAX_M:g})")
    ap.add_argument("--out", type=Path, default=ROOT / "web" / "public" / "data" / "route.geojson")
    args = ap.parse_args()
    fc = build_route(args.cell, args.limit, args.snap)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    r = fc["features"][0]["properties"]
    n = len(fc["features"][0]["geometry"]["coordinates"])
    print(f"wrote {args.out.relative_to(ROOT)}: {n} points, round trip {r['length_m']:.0f} m "
          f"(out {r['outbound_length_m']:.0f} m), max slope {r['max_slope_deg']:.1f} deg, "
          f"climb {r['climb_m']:.0f} m, descent {r['descent_m']:.0f} m"
          + ("  [SAMPLE stops]" if fc["properties"].get("sample") else ""))
    for f in fc["features"][1:]:
        p = f["properties"]
        if p["role"] != "stop":
            continue
        print(f"  stop {p['order']} {p['name']}: {f['geometry']['coordinates']}, snapped {p['snapped_m']} m")


if __name__ == "__main__":
    main()
