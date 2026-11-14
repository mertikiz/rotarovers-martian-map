import sys, numpy as np, rasterio
from rasterio.enums import Resampling
url = "/vsicurl/" + sys.argv[1]
target = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0   # metres per cell
with rasterio.open(url) as ds:
    print("size", ds.width, "x", ds.height, "res", [round(r, 3) for r in ds.res], "overviews", ds.overviews(1))
    print("crs", ds.crs.to_string()[:120])
    f = max(1, int(round(target / ds.res[0])))
    z = ds.read(1, out_shape=(ds.height // f, ds.width // f), resampling=Resampling.average, masked=True).astype("float64")
    cell = ds.res[0] * f
z = np.ma.filled(z, np.nan)
gy, gx = np.gradient(z, cell)
slope = np.degrees(np.arctan(np.hypot(gx, gy)))
v = slope[np.isfinite(slope)]
print(f"cell {cell:.1f} m, valid cells {v.size}, area ~{v.size*cell*cell/1e6:.1f} km2")
print("elevation m: min %.0f max %.0f" % (np.nanmin(z), np.nanmax(z)))
for p in (50, 75, 90, 95, 99): print(f"slope p{p}: {np.percentile(v, p):.1f} deg")
for t in (5, 10, 15, 20, 25, 30): print(f"share of area under {t:2d} deg: {100*np.mean(v < t):.1f}%")
