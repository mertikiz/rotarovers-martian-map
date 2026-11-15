/** Look of the route on the map: a smoothed line for display and an icon per science stop instead of a number.
 *  Display only: lengths, slopes and the walker still use the computed route as it is. */

/** Chaikin corner cutting: rounds the 5 m grid's stair steps. Keeps both ends; each pass moves corners by at most
 *  a quarter of a segment (~1.3 m on this route), well under a pixel at the map's walk scale. */
export function smoothLine(coords: number[][], passes = 2): number[][] {
  let pts = coords
  for (let p = 0; p < passes && pts.length > 2; p++) {
    const out: number[][] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by])
    }
    out.push(pts[pts.length - 1])
    pts = out
  }
  return pts
}

/** 24×24 stroke icons, one per stop by its science theme; unknown stops get a plain marker. */
export const STOP_ICONS: Record<string, string> = {
  // water once flowed here: a drop
  'Possible Inverted Channel': 'M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z',
  // layered rock in the canyon wall
  'East Wall Layers': 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5',
  // boulders moved by past mass wasting
  'Debris Deposits': 'M2 19h20M4 19a3 3 0 0 1 6 0M9 19a4.5 4.5 0 0 1 9 0M16 19a2.5 2.5 0 0 1 5 0',
  // sulfate minerals: a crystal
  'Sulfate Strata and Alcoves': 'M12 3l5 6-5 12-5-12zM7 9h10',
  // the turnaround: a flag
  'Northern Canyon Terrace': 'M6 21V4h11l-2 4 2 4H6',
}
export const DEFAULT_STOP_ICON = 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 8v4'
/** The base: a habitat dome. */
export const BASE_ICON = 'M3 18a9 9 0 0 1 18 0zM2 18h20M10 18v-3h4v3'

export function stopIcon(name: string): string {
  return STOP_ICONS[name] ?? DEFAULT_STOP_ICON
}

/** A round map badge with the icon in the middle, as an SVG data URL for an OpenLayers Icon style. */
export function badgeSvg(iconPath: string, o: { size: number; fill: string; ring: string; ink: string }): string {
  const r = o.size / 2
  const k = (o.size * 0.55) / 24 // the icon takes ~55 % of the badge
  const off = r - 12 * k
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${o.size}" height="${o.size}" viewBox="0 0 ${o.size} ${o.size}">` +
    `<circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${o.fill}" stroke="${o.ring}" stroke-width="2.5"/>` +
    `<g transform="translate(${off} ${off}) scale(${k})" fill="none" stroke="${o.ink}" stroke-width="2"` +
    ` stroke-linecap="round" stroke-linejoin="round"><path d="${iconPath}"/></g></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/** '#0891b2' -> 'rgba(8, 145, 178, a)'; other colour forms are returned unchanged. */
export function withAlpha(hex: string, a: number): string {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
