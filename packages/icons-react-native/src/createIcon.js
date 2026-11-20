import { createElement, forwardRef, useMemo } from 'react'
import { SvgAst, parse } from 'react-native-svg'

import {
  isSecondarySvgLayer,
  resolveIconMarkup
} from '../../icons-data/svg-rendering.mjs'

/**
 * @param {import('react-native-svg').XmlAST} element
 * @param {Pick<import('./createIcon').IconProps, 'color' | 'secondaryColor' | 'strokeWidth'>} options
 * @param {boolean} [secondaryLayer]
 */
const applySvgPaint = (element, options, secondaryLayer = false) => {
  const { props } = element
  const { color, secondaryColor, strokeWidth } = options
  const tintLayer =
    secondaryColor != null && (secondaryLayer || isSecondarySvgLayer(props))
  const paint = tintLayer ? secondaryColor : color
  if (paint != null) {
    if (props.fill === 'currentColor') props.fill = paint
    if (props.stroke === 'currentColor') props.stroke = paint
  }
  if (color != null && props.stopColor === 'currentColor')
    props.stopColor = color
  if (strokeWidth != null && props.strokeWidth !== undefined) {
    props.strokeWidth = String(strokeWidth)
  }
  for (const child of element.children) {
    if (typeof child !== 'string') applySvgPaint(child, options, tintLayer)
  }
  return element
}

/**
 * Factory that builds a forwardRef icon component for React Native.
 * @param {string} displayName  PascalCase icon name
 * @param {Object} iconData     { O?: string, F?: string, DO?: string, DF?: string }
 */
const createIcon = (displayName, iconData) => {
  const Icon = forwardRef(
    /**
     * @param {import('./createIcon').IconProps} props
     * @param {import('react').Ref<Svg>} ref
     */
    (
      {
        color,
        secondaryColor,
        size = 24,
        weight = 'outline',
        strokeWidth,
        style,
        ...rest
      },
      ref
    ) => {
      const { markup, isDuotone } = resolveIconMarkup(iconData, weight)
      const duotoneColor = isDuotone ? secondaryColor : undefined
      const ast = useMemo(() => {
        const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${markup}</svg>`
        try {
          return parse(xml, element =>
            applySvgPaint(element, {
              color,
              secondaryColor: duotoneColor,
              strokeWidth
            })
          )
        } catch (error) {
          console.error(error)
          return null
        }
      }, [markup, color, duotoneColor, strokeWidth])
      return createElement(SvgAst, {
        ast,
        override: { ref, width: size, height: size, style, ...rest }
      })
    }
  )

  Icon.displayName = displayName
  return Icon
}

export { createIcon }
export default createIcon
