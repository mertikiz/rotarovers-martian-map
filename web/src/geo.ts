import { getDistance } from 'ol/sphere.js'

/** Radius of the Mars 2015 sphere used by the HiRISE DTM. ol/sphere defaults to Earth's radius. */
export const MARS_RADIUS_M = 3396190

export type LonLat = [number, number]

/** Length of a [lon, lat] polyline on Mars, in metres. */
export function routeLengthM(coords: LonLat[]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) total += getDistance(coords[i - 1], coords[i], MARS_RADIUS_M)
  return total
}
