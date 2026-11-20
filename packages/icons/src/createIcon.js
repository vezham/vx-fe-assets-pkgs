const W_MAP = {
  outline: 'O',
  filled: 'F',
  'duotone-outline': 'DO',
  'duotone-filled': 'DF'
}

/**
 * Escape a value for safe embedding inside an HTML/SVG attribute.
 * @param {unknown} v
 */
const escAttr = v =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Factory that builds an icon function returning an SVG element.
 * @param {string} displayName  PascalCase icon name
 * @param {Record<string, string | undefined>} iconData     { O?: string, F?: string, DO?: string, DF?: string }
 * @returns {function(import('./createIcon').IconOptions=): SVGSVGElement | null}
 */
const createIcon = (displayName, iconData) => {
  /**
   * @param {import('./createIcon').IconWeight} weight
   * @param {number | string} [strokeWidth]
   */
  const getMarkup = (weight, strokeWidth) => {
    const key = W_MAP[weight] || 'O'
    const firstKey = Object.keys(iconData)[0] || ''
    let html = iconData[key] || (firstKey ? iconData[firstKey] : '') || ''

    if (strokeWidth != null) {
      html = html.replace(
        /stroke-width="[^"]*"/g,
        'stroke-width="' + strokeWidth + '"'
      )
    }
    return html
  }

  /**
   * Create an SVG element for this icon.
   * @param {import('./createIcon').IconOptions} [options]
   * @returns {SVGSVGElement | null}
   */
  const icon = (options = {}) => {
    const {
      color,
      size = 24,
      weight = 'outline',
      strokeWidth,
      className,
      attrs = {}
    } = options

    const html = getMarkup(weight, strokeWidth)

    if (typeof document === 'undefined') {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '@vezham/icons: document is not defined when rendering icon "' +
            displayName +
            '". Use toSvg() for Server-Side Rendering (SSR).'
        )
      }
      return null
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('class', className ? 'vx-icon ' + className : 'vx-icon')
    if (color != null) svg.style.color = color

    for (const [k, v] of Object.entries(attrs)) {
      svg.setAttribute(k, String(v))
    }

    svg.innerHTML = html
    return svg
  }

  icon.displayName = displayName
  icon.iconData = iconData

  /**
   * Returns the SVG markup as a string (useful for SSR or innerHTML).
   * @param {import('./createIcon').IconOptions} [options] - Same options as the icon function
   * @returns {string}
   */
  icon.toSvg = (options = {}) => {
    const {
      color,
      size = 24,
      weight = 'outline',
      strokeWidth,
      className,
      attrs = {}
    } = options

    const html = getMarkup(weight, strokeWidth)

    const extraAttrs = Object.entries(attrs)
      .map(([k, v]) => `${escAttr(k)}="${escAttr(v)}"`)
      .join(' ')

    const colorStyle = color != null ? ` style="color: ${escAttr(color)}"` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${escAttr(size)}" height="${escAttr(size)}" viewBox="0 0 24 24" fill="none" class="${escAttr(className ? 'vx-icon ' + className : 'vx-icon')}"${colorStyle}${extraAttrs ? ' ' + extraAttrs : ''}>${html}</svg>`
  }

  return icon
}

export { createIcon }
export default createIcon
