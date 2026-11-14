import proj4 from 'proj4'
import { get as getProjection } from 'ol/proj.js'
import { register } from 'ol/proj/proj4.js'

/** Projection of the HiRISE DTM: Mars (2015) sphere, equirectangular, metres. */
export const EQC = 'MARS2015:EQC'
/** Geographic coordinates on the same sphere: GeoJSON [lon, lat] in degrees. */
export const LONLAT = 'MARS2015:LONLAT'

proj4.defs(EQC, '+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs')
proj4.defs(LONLAT, '+proj=longlat +R=3396190 +no_defs')
register(proj4)

// OpenLayers measures ground resolution through EPSG:4326 with Earth's radius, which would make the scale bar
// 1.87x too long here. One projected metre is one metre on Mars (north-south; east-west differs by cos(lat),
// under 0.4 % in the study area), so the resolution is used as is.
getProjection(EQC)!.setGetPointResolution((resolution: number) => resolution)
