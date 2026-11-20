'use client'
import { createElement, forwardRef } from 'react'

import { resolveIconMarkup } from '../../icons-data/svg-rendering.mjs'
import { parseSvgElements, renderSvgElements } from './svg-elements.js'

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
        secondaryColor,
        size = 24,
        weight = 'outline',
        strokeWidth,
        className,
        style,
        ...rest
      },
      ref
    ) => {
      delete rest.dangerouslySetInnerHTML
      const { markup, isDuotone } = resolveIconMarkup(iconData, weight)
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
        renderSvgElements(
          elements,
          strokeWidth,
          isDuotone ? secondaryColor : undefined
        )
      )
    }
  )

  Icon.displayName = displayName
  return Icon
}

export { createIcon }
export default createIcon
