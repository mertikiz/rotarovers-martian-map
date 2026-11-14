"""Map layers for the web app from the HiRISE DTM: a hillshade and a slope-class overlay.

Usage (from the repo root, inside the venv):
    python pipeline/layers.py            # 5 m cells, same grid as route.py

Writes web/public/data/hillshade.png, slope.png and layers.json (image extent in DTM projection metres).
"""
import json
import math
import warnings

import numpy as np
import rasterio
from rasterio.errors import NotGeoreferencedWarning

import route as R

warnings.filterwarnings("ignore", category=NotGeoreferencedWarning)  # the PNGs are placed by layers.json

OUT = R.ROOT / "web" / "public" / "data"
# Slope classes for the overlay: (lower bound deg, RGBA). Below the first bound stays transparent.
SLOPE_CLASSES = [(15.0, (245, 158, 11, 120)),   # 15-20 deg: walkable but steep (amber)
                 (20.0, (220, 38, 38, 150))]    # > 20 deg: impassable for the route (red)


def hillshade(z, transform, azimuth=315.0, altitude=45.0):
    """0-255 hillshade, light from the north-west; longitude spacing corrected like route.slope_deg."""
    rows = np.arange(z.shape[0])
    _, y = rasterio.transform.xy(transform, rows, np.zeros_like(rows))
    coslat = np.cos(np.radians(np.asarray(y) / R.MARS_RADIUS_M))[:, None]
    gy, gx = np.gradient(z, abs(transform.e), abs(transform.a))
    gx = gx / coslat
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)  # rows grow southwards, so gy is d(z)/d(south)
    az, alt = math.radians(azimuth), math.radians(altitude)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(shade * 255, 0, 255)


def write_png(path, bands):
    bands = np.asarray(bands, dtype="uint8")
    with rasterio.open(path, "w", driver="PNG", width=bands.shape[2], height=bands.shape[1],
                       count=bands.shape[0], dtype="uint8") as out:
        out.write(bands)
    path.with_suffix(path.suffix + ".aux.xml").unlink(missing_ok=True)


def main(cell_m=5.0):
    z, transform = R.load_grid(cell_m)
    valid = np.isfinite(z)
    OUT.mkdir(parents=True, exist_ok=True)

    hs = np.nan_to_num(hillshade(z, transform), nan=0)
    write_png(OUT / "hillshade.png", [hs, np.where(valid, 255, 0)])

    slope = R.slope_deg(z, transform)
    rgba = np.zeros((4,) + z.shape)
    for lower, colour in SLOPE_CLASSES:
        m = np.nan_to_num(slope) > lower
        for b in range(4):
            rgba[b][m] = colour[b]
    write_png(OUT / "slope.png", rgba)

    h, w = z.shape
    left, top = transform * (0, 0)
    right, bottom = transform * (w, h)
    meta = dict(dtm=R.DTM_ID, cell_m=round(abs(transform.a), 3), projection="MARS2015:EQC",
                extent=[left, bottom, right, top], width=w, height=h,
                slope_classes=[dict(min_deg=lo, rgba=list(c)) for lo, c in SLOPE_CLASSES])
    (OUT / "layers.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    for f in ("hillshade.png", "slope.png", "layers.json"):
        print(f"wrote web/public/data/{f}: {(OUT / f).stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
