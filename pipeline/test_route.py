"""Checks for the computed route. Run from the repo root: python -m pytest pipeline -q
The route checks read web/public/data/route.geojson, so run pipeline/route.py first."""
import json
import math

import numpy as np
import pytest
import rasterio
from affine import Affine

import route as R

ROUTE = R.ROOT / "web" / "public" / "data" / "route.geojson"


# --- unit checks on synthetic grids -------------------------------------------------------------

def test_slope_of_a_known_plane():
    # Plane rising 10 deg towards the north, at the equator (no longitude correction there).
    cell = 5.0
    t = Affine(cell, 0, 0, 0, -cell, 0)
    rows = np.arange(40)[:, None] * np.ones((1, 40))
    z = -rows * cell * math.tan(math.radians(10))
    s = R.slope_deg(z, t)
    assert np.allclose(s, 10.0, atol=1e-6)


def test_blocked_cells_get_a_buffer_so_diagonals_cannot_cut_corners():
    slope = np.zeros((7, 7))
    slope[3, 3] = 45.0
    ok = R.walkable(slope, 20.0)
    assert not ok[2:5, 2:5].any()          # the steep cell and its 8 neighbours are blocked
    assert ok[0, 0] and ok[6, 6]


def test_router_never_enters_an_impassable_cell():
    ok = np.ones((9, 9), bool)
    ok[1:9, 4] = False                      # a wall with a gap at the top row
    cost = np.where(ok, 1.0, np.inf)
    mcp = R.MCP_Geometric(cost, fully_connected=True)
    mcp.find_costs([(8, 0)], [(8, 8)])
    path = mcp.traceback((8, 8))
    assert all(ok[p] for p in path)
    assert min(p[0] for p in path) == 0     # it had to go round through the gap


# --- checks on the real computed route ----------------------------------------------------------

@pytest.fixture(scope="module")
def fc():
    if not ROUTE.exists():
        pytest.skip("run pipeline/route.py first")
    return json.loads(ROUTE.read_text("utf-8"))


@pytest.fixture(scope="module")
def grid(fc):
    cell = fc["properties"]["cell_m"]
    z, t = R.load_grid(round(cell))
    return z, t, R.slope_deg(z, t)


def _route(fc):
    return next(f for f in fc["features"] if f["properties"]["role"] == "route")


def _cells(coords, t):
    xs, ys = R.TO_EQC.transform(*np.asarray(coords).T)
    rows, cols = rasterio.transform.rowcol(t, xs, ys)
    return list(zip(np.asarray(rows).astype(int), np.asarray(cols).astype(int)))


def test_every_point_is_inside_the_footprint(fc):
    pts = [f["geometry"]["coordinates"] for f in fc["features"] if f["geometry"]["type"] == "Point"]
    pts += _route(fc)["geometry"]["coordinates"]
    assert all(R.in_footprint(lon, lat) for lon, lat in pts)


def test_max_slope_on_route_is_below_the_limit(fc, grid):
    _, t, slope = grid
    limit = fc["properties"]["slope_limit_deg"]
    on_route = np.array([slope[c] for c in _cells(_route(fc)["geometry"]["coordinates"], t)])
    assert np.isfinite(on_route).all()
    assert on_route.max() < limit
    assert abs(on_route.max() - _route(fc)["properties"]["max_slope_deg"]) < 0.01


def test_route_is_continuous(fc):
    coords = _route(fc)["geometry"]["coordinates"]
    step_max = fc["properties"]["cell_m"] * math.sqrt(2) * 1.01
    steps = [R.ground_distance_m(*a, *b) for a, b in zip(coords, coords[1:])]
    assert 0 < min(steps) and max(steps) <= step_max


def test_length_matches_the_mars_radius_sum(fc):
    coords = _route(fc)["geometry"]["coordinates"]
    total = sum(R.ground_distance_m(*a, *b) for a, b in zip(coords, coords[1:]))
    assert abs(total - _route(fc)["properties"]["length_m"]) < 0.5


def test_stops_lie_on_the_route_in_order(fc):
    coords = [tuple(c) for c in _route(fc)["geometry"]["coordinates"]]
    stops = sorted((f for f in fc["features"] if f["properties"]["role"] == "stop"),
                   key=lambda f: f["properties"]["order"])
    idx = [coords.index(tuple(f["geometry"]["coordinates"])) for f in stops]
    assert idx == sorted(idx) and idx[0] == 0 and idx[-1] == len(coords) - 1


def test_placeholder_stops_are_labelled_sample(fc):
    real = bool(R._read_csv(R.ROOT / "content" / "stops.csv"))
    flags = [fc["properties"].get("sample", False)] + [f["properties"].get("sample", False) for f in fc["features"]]
    assert all(flags) if not real else not any(flags)
