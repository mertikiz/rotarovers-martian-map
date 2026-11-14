# Data and References

Every link below was opened and checked on 14 Nov 2026. Where a source page does not state a license, the row says
"license not verified" instead of guessing.

## NASA data

| Data | Mission / instrument | How we use it | Link | License or credit line |
|---|---|---|---|---|
| HiRISE DTM `DTEEC_006855_1750_007501_1750_A01` | MRO / HiRISE | Elevation, slope grid, route cost surface, hillshade and slope map layers | [HiRISE DTM page](https://www.uahirise.org/dtm/dtm.php?ID=PSP_006855_1750); file read from [USGS Astrogeology](https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_006855_1750_PSP_007501_1750/DTEEC_006855_1750_007501_1750_A01.tif) | Credit: NASA/JPL-Caltech/UArizona (DTM page). License not stated on the DTM page |
| HiRISE images `PSP_006855_1750` and `PSP_007501_1750` | MRO / HiRISE | Image caption used for stops 1, 2 and 5 | [PSP_006855_1750](https://www.uahirise.org/PSP_006855_1750), [PSP_007501_1750](https://www.uahirise.org/PSP_007501_1750) | Public domain per the HiRISE usage policy on the image pages; credit NASA/JPL-Caltech/UArizona |
| Curiosity REMS daily weather | MSL (Curiosity) / REMS | Conditions panel: air and ground temperature, pressure, UV index, sunrise and sunset (the feed has no wind) | [REMS weather feed](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json) | Provided by Centro de Astrobiología (CAB); the feed says it is "intended for outreach purposes only". License not verified |
| Curiosity waypoints | MSL (Curiosity) | Rover's latest position, to give the distance of the REMS readings from our base | [MMGIS MSL waypoints](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) | License not verified |
| InSight weather | InSight / weather sensors | Conditions panel: wind speed, air temperature, pressure (sols 675–681, 2020) | [Data (public demo key)](https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0&api_key=DEMO_KEY), [API documentation](https://api.nasa.gov/assets/insight/InSight%20Weather%20API%20Documentation.pdf) | API maintained by NASA JPL and Cornell University (API documentation). License not verified |
| Curiosity RAD surface radiation dose | MSL (Curiosity) / RAD | Conditions panel: average dose equivalent rate (0.67 mSv/day, Aug 2012 to Jun 2013) and the walk estimate | [Hassler et al. 2014, Science](https://doi.org/10.1126/science.1244797), [SwRI press release](https://www.swri.org/newsroom/press-releases/swri-scientists-publish-first-radiation-measurements-the-surface-of-mars) | Value cited from the publication. License not applicable |

## Other references

| Reference | Used for | Link |
|---|---|---|
| Hughes et al. 2019, LPSC abstract 3196 | Sulfate-bearing strata, alcoves and debris deposits in the canyon (stop 4) | [PDF](https://www.hou.usra.edu/meetings/lpsc2019/pdf/3196.pdf) |
| Hughes et al. 2020, LPSC abstract 2426 | Debris deposits, levees and water-assisted slope failure (stop 3) | [PDF](https://www.hou.usra.edu/meetings/lpsc2020/pdf/2426.pdf) |
| Golombek et al. 2020, Earth and Space Science | InSight lander position, for the distance of the InSight readings | [doi:10.1029/2020EA001248](https://doi.org/10.1029/2020EA001248) |
| USGS Gazetteer of Planetary Nomenclature, Sakarya Vallis | Name of the valley in the study area (stop 5 notes) | [Feature 15941](https://planetarynames.wr.usgs.gov/Feature/15941) |

## Walkable slope limit (20°)

The route treats ground steeper than 20° as impassable. This is a **lunar** EVA planning value used as a working
assumption for Mars; none of these sources sets a Mars limit. Quotes checked in the documents themselves (PDF page
numbers as counted by a PDF reader).

| Source | What it says | Link |
|---|---|---|
| NASA, *Exploration EVA System Concept of Operations*, EVA-EXP-0042 Rev B (2020) | Suit mobility: "Walking up/down/across a slope of up to 20°" (PDF p. 38); Artemis III crews walk "up/down slopes of up to 20°" within ~2 km of the lander (p. 95) | [PDF (LPI)](https://www.lpi.usra.edu/lunar/artemis/resources/EVA-CONOPS_EVA-EXP-0042_RevB_19Oct2020.pdf) |
| NASA, L. Ortiz, *Artemis Human Landing System Overview*, NASA Space Apps Challenge 2025 | "Slopes for Extravehicular Activity (EVA) must be less than 20 deg"; "No EVAs can occur in black areas" (slope > 20°) (PDF p. 24) | [PDF (NTRS)](https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf) |
| Z. Scoville (NASA), *Artemis III EVA Mission Capability for de Gerlache-Shackleton Ridge* (2021) | "Astronaut in suit must be able to walk up, down, across a 20-degree slope" (PDF p. 4) | [PDF (NTRS)](https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf) |
| Same ConOps (2020), walking speed | Crew "may walk a total distance of 16 km on level terrain at 2 km/hr", slower on harder terrain (PDF p. 95). The walk view uses 2 km/h | [PDF (LPI)](https://www.lpi.usra.edu/lunar/artemis/resources/EVA-CONOPS_EVA-EXP-0042_RevB_19Oct2020.pdf) |
| D. A. Kring (LPI), quoted in Universe Today, 24 Oct 2023 | "Any traverse needs to be on slopes less than 20 degrees." The same article reports a study that used slopes below 15° | [Article](https://www.universetoday.com/articles/lunar-astronauts-will-need-easy-walking-trails-around-the-moons-south-pole) |

## Software

Licenses read from each installed package's own metadata (`web/node_modules/<package>/package.json`, Python package
metadata).

| Package | Used for | License |
|---|---|---|
| react | Web user interface | MIT |
| ol (OpenLayers) | Map rendering, image layers, route and stop features | BSD-2-Clause |
| proj4 | Mars equirectangular projection in the browser | MIT |
| vite | Build and development server | MIT |
| typescript | Type checking | Apache-2.0 |
| rasterio | Reading and resampling the HiRISE DTM over HTTP | BSD-3-Clause |
| numpy | Array maths: slope, hillshade, elevation | BSD-3-Clause (plus bundled 0BSD, MIT, Zlib parts) |
| scipy | Walkable-area buffer and connected-area labelling (`scipy.ndimage`) | BSD (OSI-approved BSD License) |
| scikit-image | Least-cost route search (`skimage.graph.MCP_Geometric`) | BSD (OSI-approved BSD License) |
| pyproj | Conversion between DTM metres and Mars longitude/latitude | MIT |
| ensarsadikoglu/D2-mars-haritasi | Base web scaffold, Vite configuration and lint setup | MIT |
