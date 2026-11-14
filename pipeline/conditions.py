"""Latest available surface conditions for the conditions panel, saved as a static, dated JSON file.

Usage (from the repo root, inside the venv; needs internet):
    python pipeline/conditions.py        # NASA_API_KEY env var is used for api.nasa.gov if set, else DEMO_KEY

Writes web/public/data/conditions.json. Run pipeline/route.py first (distances are measured to the walk's base).
These are point measurements at other places and times, not a forecast for the route; the file says so.
"""
import json
import os
import urllib.request
from datetime import datetime, timezone

import route as R

OUT = R.ROOT / "web" / "public" / "data" / "conditions.json"
REMS_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"
INSIGHT_URL = "https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0&api_key="
WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json"
# InSight lander position: Golombek et al. (2020), Earth and Space Science, doi:10.1029/2020EA001248 (abstract).
INSIGHT_LONLAT = (135.623447, 4.502384)
INSIGHT_SOURCE = "https://doi.org/10.1029/2020EA001248"
# RAD: SwRI press release of 9 Dec 2013 on Hassler et al., Science (2014), doi:10.1126/science.1244797.
RAD = dict(
    dose_equivalent_msv_per_day=0.67,
    period="August 2012 to June 2013",
    what="Average galactic cosmic ray dose equivalent rate on the surface at Gale crater, measured by Curiosity's "
         "RAD. The rate varies from day to night with atmospheric shielding.",
    source_url="https://www.swri.org/newsroom/press-releases/swri-scientists-publish-first-radiation-measurements-the-surface-of-mars",
    paper_doi="https://doi.org/10.1126/science.1244797",
)


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "rotarovers-martian-map pipeline"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def latest_rems():
    """Most recent sol in the CAB REMS feed that has air temperatures."""
    soles = get_json(REMS_URL)["soles"]
    s = next(s for s in soles if num(s.get("min_temp")) is not None)
    return dict(
        sol=int(s["sol"]), earth_date=s["terrestrial_date"], solar_longitude_deg=num(s.get("ls")),
        air_temp_min_c=num(s["min_temp"]), air_temp_max_c=num(s["max_temp"]),
        ground_temp_min_c=num(s.get("min_gts_temp")), ground_temp_max_c=num(s.get("max_gts_temp")),
        pressure_pa=num(s.get("pressure")), sky=s.get("atmo_opacity"), uv_index=s.get("local_uv_irradiance_index"),
        sunrise_local=s.get("sunrise"), sunset_local=s.get("sunset"),
        source_url=REMS_URL,
        note="REMS values via the Centro de Astrobiologia (CAB) outreach feed; CAB points to the PDS for "
             "scientific REMS data. Wind and humidity are not reported in this feed.",
    )


def latest_insight():
    """Most recent sol with temperature, wind and pressure from the InSight weather service (mission ended 2022)."""
    d = get_json(INSIGHT_URL + os.environ.get("NASA_API_KEY", "DEMO_KEY"))
    for sol in reversed(d["sol_keys"]):
        s = d[sol]
        if all(k in s for k in ("AT", "HWS", "PRE")):
            return dict(
                sol=int(sol), first_utc=s["First_UTC"], last_utc=s["Last_UTC"],
                air_temp_min_c=s["AT"]["mn"], air_temp_max_c=s["AT"]["mx"],
                wind_avg_mps=s["HWS"]["av"], wind_max_mps=s["HWS"]["mx"], pressure_avg_pa=s["PRE"]["av"],
                # NASA's public demo key, so the link opens the same data for anyone (a bare URL returns 403).
                source_url=INSIGHT_URL + "DEMO_KEY",
                note="Last sols published by the InSight weather service, Elysium Planitia, 2020.",
            )
    raise SystemExit("No InSight sol with temperature, wind and pressure.")


def curiosity_position():
    wp = get_json(WAYPOINTS_URL)["features"]
    last = max(wp, key=lambda f: (f["properties"]["sol"], f["properties"].get("dist_total_m", 0)))
    p = last["properties"]
    return dict(sol=p["sol"], lon=p["lon"], lat=p["lat"], source_url=WAYPOINTS_URL)


def main():
    route = json.loads((R.ROOT / "web" / "public" / "data" / "route.geojson").read_text("utf-8"))
    base = next(f for f in route["features"] if f["properties"]["role"] == "base")["geometry"]["coordinates"]
    rover = curiosity_position()
    rems = latest_rems()
    rems["distance_to_base_km"] = round(R.ground_distance_m(rover["lon"], rover["lat"], *base) / 1000, 1)
    rems["rover_position"] = rover
    insight = latest_insight()
    insight["distance_to_base_km"] = round(R.ground_distance_m(*INSIGHT_LONLAT, *base) / 1000, 0)
    insight["lander_lonlat"] = list(INSIGHT_LONLAT)
    insight["lander_position_source"] = INSIGHT_SOURCE
    rad = dict(RAD, distance_note="Measured by Curiosity in Gale crater, about the same region as the walk.")
    out = dict(
        generated_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        disclaimer="Latest available measurements at other places and times. Not a forecast for the route.",
        rems=rems, insight=insight, rad=rad,
    )
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT.relative_to(R.ROOT)}")
    print(f"  REMS sol {rems['sol']} ({rems['earth_date']}): {rems['air_temp_min_c']}..{rems['air_temp_max_c']} C, "
          f"{rems['pressure_pa']} Pa, UV {rems['uv_index']}, rover sol {rover['sol']} {rems['distance_to_base_km']} km away")
    print(f"  InSight sol {insight['sol']} ({insight['first_utc'][:10]}): wind avg {insight['wind_avg_mps']:.1f} max "
          f"{insight['wind_max_mps']:.1f} m/s, {insight['distance_to_base_km']:.0f} km away")


if __name__ == "__main__":
    main()
