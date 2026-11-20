'use client'
import { createElement, forwardRef } from 'react'

import { parseSvgElements, renderSvgElements } from './svg-elements.js'

const W_MAP = {
  outline: 'O',
  filled: 'F',
  'duotone-outline': 'DO',
  'duotone-filled': 'DF'
}

/**
 * Factory that builds a forwardRef icon component.
 * @param {string} displayName  PascalCase icon name
 * @param {Record<string, string | undefined>} iconData     { O?: string, F?: string, DO?: string, DF?: string }
 */
const createIcon = (displayName, iconData) => {
  /** @type {Map<string, ReturnType<typeof parseSvgElements>>} */
  const parsedIcons = new Map()
  const Icon = forwardRef(
    /**
     * @param {import('./createIcon').IconProps} props
     * @param {import('react').Ref<SVGSVGElement>} ref
     */
    (
      {
        color,
        size = 24,
        weight = 'outline',
        strokeWidth,
        className,
        style,
        ...rest
      },
      ref
    ) => {
      delete rest.secondaryColor
      delete rest.dangerouslySetInnerHTML
      const key = W_MAP[weight] || 'O'
      const markup = iconData[key] || iconData[Object.keys(iconData)[0]] || ''
      let elements = parsedIcons.get(markup)
      if (!elements) {
        elements = parseSvgElements(markup)
        parsedIcons.set(markup, elements)
      }

      return createElement(
        'svg',
        {
          ref,
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          className: className ? 'vezham ' + className : 'vezham',
          style: color != null ? { color, ...style } : style,
          ...rest
        },
        renderSvgElements(elements, strokeWidth)
      )
    }
  )

  Icon.displayName = displayName
  return Icon
}

export { createIcon }
export default createIcon
