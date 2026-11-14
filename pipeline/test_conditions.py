"""Checks for web/public/data/conditions.json. Run: python -m pytest pipeline -q (after pipeline/conditions.py)."""
import json
from datetime import date, datetime

import pytest

import conditions as C
import route as R

PATH = R.ROOT / "web" / "public" / "data" / "conditions.json"


@pytest.fixture(scope="module")
def cond():
    if not PATH.exists():
        pytest.skip("run pipeline/conditions.py first")
    return json.loads(PATH.read_text("utf-8"))


@pytest.fixture(scope="module")
def base():
    route = json.loads((R.ROOT / "web" / "public" / "data" / "route.geojson").read_text("utf-8"))
    return next(f for f in route["features"] if f["properties"]["role"] == "base")["geometry"]["coordinates"]


def test_says_it_is_not_a_forecast(cond):
    assert "Not a forecast" in cond["disclaimer"]
    datetime.strptime(cond["generated_utc"], "%Y-%m-%dT%H:%MZ")


def test_rems_is_dated_and_plausible(cond, base):
    r = cond["rems"]
    assert date.fromisoformat(r["earth_date"]) <= datetime.strptime(cond["generated_utc"], "%Y-%m-%dT%H:%MZ").date()
    assert -140 < r["air_temp_min_c"] <= r["air_temp_max_c"] < 40
    assert 400 < r["pressure_pa"] < 1300
    p = r["rover_position"]
    assert abs(R.ground_distance_m(p["lon"], p["lat"], *base) / 1000 - r["distance_to_base_km"]) < 0.1


def test_insight_uses_the_published_lander_position(cond, base):
    i = cond["insight"]
    assert i["lander_lonlat"] == list(C.INSIGHT_LONLAT)
    assert i["first_utc"].startswith("2020-")
    assert 0 <= i["wind_avg_mps"] <= i["wind_max_mps"]
    assert abs(R.ground_distance_m(*C.INSIGHT_LONLAT, *base) / 1000 - i["distance_to_base_km"]) < 1


def test_rad_matches_the_cited_value(cond):
    assert cond["rad"]["dose_equivalent_msv_per_day"] == 0.67
    assert cond["rad"]["period"] == "August 2012 to June 2013"


def test_every_source_is_an_https_link(cond):
    for part in ("rems", "insight", "rad"):
        assert cond[part]["source_url"].startswith("https://")
