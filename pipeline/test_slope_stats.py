"""Checks for slope_stats.slope_stats on synthetic grids. Run from the repo root: python -m pytest pipeline -q"""
import math

import numpy as np

from slope_stats import slope_stats


def plane(deg, n=30, cell=5.0):
    """A plane rising `deg` degrees towards the north (rows grow southwards)."""
    rows = np.arange(n)[:, None] * np.ones((1, n))
    return -rows * cell * math.tan(math.radians(deg))


def test_a_10_degree_plane_has_every_percentile_at_10_degrees():
    s = slope_stats(plane(10.0), 5.0)
    for p in (50, 75, 90, 95, 99):
        assert abs(s["slope_percentiles"][p] - 10.0) < 1e-6
    assert s["share_under"][15] == 100.0
    assert s["share_under"][5] == 0.0


def test_area_counts_only_valid_cells():
    z = plane(5.0, n=10)
    z[0, :] = np.nan  # a no-data row
    s = slope_stats(z, 5.0)
    assert s["valid_cells"] < 100
    assert math.isclose(s["area_km2"], s["valid_cells"] * 25 / 1e6)
    assert math.isclose(s["elev_min"], np.nanmin(z))


def test_share_under_a_threshold_splits_a_two_slope_grid():
    z = np.vstack([plane(10.0, n=40)[:20], plane(30.0, n=40)[:20] + 1000])  # top half 10 deg, bottom 30 deg
    s = slope_stats(z, 5.0)
    assert 35.0 < s["share_under"][20] < 65.0   # roughly half the cells are gentler than 20 deg
