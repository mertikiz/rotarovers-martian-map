# RotaRovers Martian Map

Team **RotaRovers** · 2026 NASA Space Apps Challenge (Universal Event) · Challenge:
[Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)

> Work in progress during the hackathon (Nov 14–15, 2026). Live: https://rotarovers-martian-map.pages.dev

A map a Mars astronaut uses **before a Marswalk to plan it** and **during the walk to follow it**: a route computed from
NASA terrain data that keeps the crew on walkable slopes while reaching stops of scientific interest for past
habitability and water, near Gale crater.

## Repository layout
| Path | What |
|---|---|
| `web/` | Web app: React + Vite + TypeScript, OpenLayers + proj4 |
| `pipeline/` | Python data preparation (terrain → slope grid → route) |

## Run locally
```bash
cd web
npm ci
npm run dev
npm test        # web route length agrees with the pipeline (Mars radius)
```

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r pipeline/requirements.txt
.venv/Scripts/python pipeline/route.py     # route  -> web/public/data/route.geojson
.venv/Scripts/python pipeline/layers.py    # hillshade + slope images -> web/public/data/
.venv/Scripts/python -m pytest pipeline -q
```

## Data (so far)
| Data | Source | Use |
|---|---|---|
| HiRISE DTM `DTEEC_006855_1750_007501_1750_A01` (~1 m/px) | NASA MRO HiRISE via [USGS Astrogeology STAC](https://stac.astrogeology.usgs.gov/) (`mro_hirise_socet_dtms`) | Elevation → slope → route; hillshade and slope map layers |
| Curiosity traverse | NASA [MMGIS MSL traverse](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json) | Context: where the rover has been |

## Credits
- The `web/` project scaffold (Vite, TypeScript, lint configuration) is reused from our team's public practice repo
  [`mertikiz/mars-drills`](https://github.com/mertikiz/mars-drills) (`ensarsadikoglu/D2-mars-haritasi`, MIT).
- Use of AI (SI) tools is declared on the project page and in commit history.

License: [MIT](LICENSE).
