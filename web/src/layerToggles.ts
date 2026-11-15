/** The map layers the user can switch on and off, in panel order. */
export const MAP_LAYERS = [
  { key: 'terrain', label: 'Terrain shading' },
  { key: 'slope', label: 'Slope classes' },
  { key: 'route', label: 'Route and stops' },
] as const

export type LayerKey = (typeof MAP_LAYERS)[number]['key']
export type LayerVisibility = Record<LayerKey, boolean>

export const ALL_LAYERS_ON: LayerVisibility = { terrain: true, slope: true, route: true }

export function setLayer(visible: LayerVisibility, key: LayerKey, on: boolean): LayerVisibility {
  return { ...visible, [key]: on }
}
