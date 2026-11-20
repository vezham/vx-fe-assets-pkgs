const weights = {
  outline: 'O',
  filled: 'F',
  'duotone-outline': 'DO',
  'duotone-filled': 'DF'
}

/**
 * @param {Record<string, string | undefined>} iconData
 * @param {keyof typeof weights} weight
 */
export const resolveIconMarkup = (iconData, weight) => {
  const key = weights[weight] || 'O'
  const requested = iconData[key]
  return {
    markup: requested || iconData[Object.keys(iconData)[0]] || '',
    isDuotone: Boolean(requested) && (key === 'DO' || key === 'DF')
  }
}

/** @param {{ opacity?: unknown, fillOpacity?: unknown, strokeOpacity?: unknown }} props */
export const isSecondarySvgLayer = props =>
  [props.opacity, props.fillOpacity, props.strokeOpacity].some(value => {
    const opacity = Number(value)
    return opacity > 0 && opacity < 1
  })

/**
 * @param {string} markup
 * @param {string | number | undefined} strokeWidth
 */
export const withStrokeWidth = (markup, strokeWidth) => {
  if (strokeWidth == null) return markup
  const width = String(strokeWidth)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return markup.replace(
    /stroke-width="[^"]*"/g,
    () => `stroke-width="${width}"`
  )
}
