# Data and References

## NASA data

| Data | Mission / instrument | How we use it | Link | License or credit line |
|---|---|---|---|---|
| HiRISE DTM `DTEEC_006855_1750_007501_1750_A01` | MRO / HiRISE | Elevation raster, slope grid calculation, route cost surface, and hillshade layer | https://stac.astrogeology.usgs.gov/ and https://www.uahirise.org/dtm/ | Public domain; Credit: NASA/JPL-Caltech/UArizona |
| HiRISE images `PSP_006855_1750` and `PSP_007501_1750` | MRO / HiRISE | Source observations and feature descriptions for science stops | https://www.uahirise.org/PSP_006855_1750 and https://www.uahirise.org/PSP_007501_1750 | Public domain; Credit: NASA/JPL-Caltech/UArizona |
| Curiosity REMS daily weather | MSL (Curiosity) / REMS | Daily atmospheric pressure, air/ground temperature, and wind data for the conditions panel | https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json | Public domain; Credit: NASA/JPL-Caltech/CAB(CSIC-INTA) |
| InSight weather | InSight / TWINS & APSS | Mars weather API feed for the conditions panel | https://api.nasa.gov/insight_weather/ | Public domain; Credit: NASA/JPL-Caltech/Cornell/CAB |
| Curiosity RAD surface radiation dose | MSL (Curiosity) / RAD | Surface radiation dose rate baseline for the conditions panel | https://doi.org/10.1126/science.1244797 and https://www.swri.org/newsroom/press-releases/swri-scientists-publish-first-radiation-measurements-the-surface-of-mars | Credit: NASA/JPL-Caltech/SwRI |

## Other references

| Reference | Used for | Link |
|---|---|---|
| Hughes et al. 2019, LPSC abstract 3196 | Identification of sulfate-bearing strata, alcoves, and debris deposits in the canyon (Stops 4 and 5) | https://www.hou.usra.edu/meetings/lpsc2019/pdf/3196.pdf |
| Hughes et al. 2020, LPSC abstract 2426 | Analysis of debris deposits, levees, and groundwater-assisted slope failure evidence (Stop 3) | https://www.hou.usra.edu/meetings/lpsc2020/pdf/2426.pdf |
| USGS Gazetteer of Planetary Nomenclature, Sakarya Vallis | Official IAU nomenclature and coordinate bounds for Sakarya Vallis (MC-23) | https://planetarynames.wr.usgs.gov/Feature/15941 |

## Software

| Package | Used for | License |
|---|---|---|
| react | Web user interface component tree and state management | MIT |
| ol | Interactive map rendering, raster layers, and vector feature display | BSD-2-Clause |
| proj4 | Mars equirectangular projection definitions in the browser | MIT |
| vite | Frontend bundling and development server | MIT |
| typescript | Static type checking and code compilation | Apache-2.0 |
| rasterio | Reading and resampling the cloud-optimized HiRISE GeoTIFF DTM | BSD-3-Clause |
| numpy | Array processing, gradient slope calculation, and cost grid generation | BSD-3-Clause |
| scipy | Graph-based pathfinding algorithms for walkable route calculation | BSD-3-Clause |
| scikit-image | Connected components analysis on the walkable terrain mask | BSD-3-Clause |
| pyproj | Coordinate transformations between projected meters and Mars planetocentric degrees | MIT |
| ensarsadikoglu/D2-mars-haritasi | Base web scaffold, Vite configuration, and lint setup | MIT |
