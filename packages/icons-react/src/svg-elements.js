import { createElement } from 'react'
import { SaxesParser } from 'saxes'

const svgTags = new Set([
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'g',
  'line',
  'linearGradient',
  'mask',
  'path',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'title',
  'tspan'
])

const svgAttributes = new Set([
  'clip-path',
  'clip-rule',
  'clipPathUnits',
  'cx',
  'cy',
  'd',
  'dx',
  'dy',
  'fill',
  'fill-opacity',
  'fill-rule',
  'font-family',
  'font-size',
  'fx',
  'fy',
  'gradientTransform',
  'gradientUnits',
  'height',
  'id',
  'mask',
  'maskUnits',
  'maskContentUnits',
  'offset',
  'opacity',
  'points',
  'preserveAspectRatio',
  'r',
  'rx',
  'ry',
  'spreadMethod',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'transform',
  'vector-effect',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2'
])

/** @typedef {{tag: string, props: Record<string, string>, children: SvgChild[]}} SvgElement */
/** @typedef {SvgElement | string} SvgChild */

/** @param {string} markup */
export const parseSvgElements = markup => {
  /** @type {SvgChild[]} */
  const children = []
  /** @type {(SvgChild[] | null)[]} */
  const stack = [children]
  const parser = new SaxesParser({ fragment: true })

  parser.on('opentag', ({ name, attributes }) => {
    const siblings = stack[stack.length - 1]
    if (!siblings || !svgTags.has(name)) {
      stack.push(null)
      return
    }

    /** @type {SvgElement} */
    const element = { tag: name, props: {}, children: [] }
    for (const [key, value] of Object.entries(attributes)) {
      if (svgAttributes.has(key)) {
        const prop = key.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase()
        )
        element.props[prop] = value
      }
    }
    siblings.push(element)
    stack.push(element.children)
  })
  parser.on('closetag', () => stack.pop())
  parser.on('text', value => stack[stack.length - 1]?.push(value))
  parser.on('cdata', value => stack[stack.length - 1]?.push(value))
  try {
    parser.write(markup).close()
  } catch {
    return []
  }
  return children
}

/**
 * @param {SvgChild[]} children
 * @param {string | number} [strokeWidth]
 * @returns {import('react').ReactNode[]}
 */
export const renderSvgElements = (children, strokeWidth) =>
  children.map((child, index) => {
    if (typeof child === 'string') return child
    const props = { ...child.props }
    if (strokeWidth != null && child.props.strokeWidth !== undefined) {
      props.strokeWidth = String(strokeWidth)
    }
    return createElement(
      child.tag,
      { ...props, key: index },
      renderSvgElements(child.children, strokeWidth)
    )
  })
