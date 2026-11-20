import { buildSvgMarkup } from '../../core/codegen.js'
import { loadIndex } from '../../core/load-index.js'
import { resolveIcon } from '../../core/search.js'
import type { IconWeight } from '../../core/types.js'

export function handleViewIcon(args: { name: string; weight: IconWeight }) {
  const resolved = resolveIcon(loadIndex(), args.name)
  if ('error' in resolved) return resolved
  const { icon } = resolved

  const svg = buildSvgMarkup(icon, args.weight)
  if (typeof svg !== 'string') {
    return svg
  }

  const availableWeights = Object.keys(icon.weights) as IconWeight[]

  return {
    name: icon.name,
    weight: args.weight,
    availableWeights,
    category: icon.category,
    tags: icon.tags,
    viewBox: icon.weights[args.weight]?.viewBox,
    svg,
    hint: 'Call apply_icon with this name and weight to generate framework-specific code.'
  }
}
