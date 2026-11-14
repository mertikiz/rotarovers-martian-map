---
name: science-stops
description: Use when researching, choosing, writing up or checking the science stops in content/stops.csv (past habitability and water, study area south of Gale crater). Keeps every stop inside the study area, sourced, and honestly worded.
---

# Science stops for the RotaRovers Marswalk

The team chose the science objective (**past habitability and water**) and the area. This skill is about doing the stop
research well. **Do not invent new project directions; do not invent facts or sources.**

## Study area
HiRISE DTM `DTEEC_006855_1750_007501_1750_A01`, south of Gale crater, about **137.1716–137.2895 °E,
5.2217–4.9504 °S**. Every stop must be inside this box. Coordinates: longitude east-positive (−180…180), latitude in
degrees (negative = south), as in `content/README.md`.

## How to find candidate stops
1. Open the area in NASA Mars Trek (https://trek.nasa.gov/mars/) and look at HiRISE/CTX imagery and the geology layer.
2. Look for features that can record past water: channels or fans, layered sedimentary rocks, light-toned veins or
   fractures, clay- or sulfate-bearing units, boxwork-like ridges.
3. For each candidate, find a **source** that supports the interpretation: a peer-reviewed paper, a NASA/JPL/USGS page,
   or a HiRISE image page (https://www.uahirise.org/) describing that feature or that kind of feature in Gale.
4. Pick 4–6 stops spread along a walkable path rather than clustered in one spot. Order them in a sensible visiting
   sequence.

## Writing each row of `content/stops.csv`
`order,name,lon_e,lat,why_habitability,source_url,notes`
- `name`: short English name you can say aloud ("Layered outcrop A"). Do not reuse official feature names unless the
  source uses them for this exact spot.
- `lon_e`, `lat`: read from Mars Trek's coordinate readout; 4 decimals are enough. Check the stop is inside the box.
- `why_habitability`: 2–3 English sentences: what the astronaut would look at and what it could tell us about past
  water or habitability. Use hedged wording for interpretations ("may record", "is consistent with").
- `source_url`: a link you **opened and read**. If the source only describes this kind of feature in Gale (not this
  exact spot), say so in `notes`.
- Quote marks: wrap any field that contains a comma in double quotes.

## Checks before saying "done"
1. 4–6 rows, `order` 1…n with no gaps, all inside the box.
2. Every `source_url` opens and supports the sentence it is attached to.
3. No sentence claims something the source does not say.
4. The CSV opens cleanly (one header row, 7 columns per row).
