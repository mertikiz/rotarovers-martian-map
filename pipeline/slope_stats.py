import sys

import numpy as np

PERCENTILES = (50, 75, 90, 95, 99)
THRESHOLDS = (5, 10, 15, 20, 25, 30)


def slope_stats(z, cell):
    """Slope summary of an elevation grid `z` (metres, NaN = no data) with square cells of `cell` metres."""
    gy, gx = np.gradient(z, cell)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    v = slope[np.isfinite(slope)]
    return {
        "valid_cells": int(v.size),
        "area_km2": v.size * cell * cell / 1e6,
        "elev_min": float(np.nanmin(z)),
        "elev_max": float(np.nanmax(z)),
        "slope_percentiles": {p: float(np.percentile(v, p)) for p in PERCENTILES},
        "share_under": {t: float(100 * np.mean(v < t)) for t in THRESHOLDS},
    }


def main():
    import rasterio
    from rasterio.enums import Resampling

    url = "/vsicurl/" + sys.argv[1]
    target = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0   # metres per cell
    with rasterio.open(url) as ds:
        print("size", ds.width, "x", ds.height, "res", [round(r, 3) for r in ds.res], "overviews", ds.overviews(1))
        print("crs", ds.crs.to_string()[:120])
        f = max(1, int(round(target / ds.res[0])))
        z = ds.read(1, out_shape=(ds.height // f, ds.width // f), resampling=Resampling.average, masked=True).astype("float64")
        cell = ds.res[0] * f
    s = slope_stats(np.ma.filled(z, np.nan), cell)
    print(f"cell {cell:.1f} m, valid cells {s['valid_cells']}, area ~{s['area_km2']:.1f} km2")
    print("elevation m: min %.0f max %.0f" % (s["elev_min"], s["elev_max"]))
    for p, value in s["slope_percentiles"].items(): print(f"slope p{p}: {value:.1f} deg")
    for t, share in s["share_under"].items(): print(f"share of area under {t:2d} deg: {share:.1f}%")


if __name__ == "__main__":
    main()
