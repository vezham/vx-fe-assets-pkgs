import { generateCode } from '../../core/codegen.js'
import { loadIndex } from '../../core/load-index.js'
import { resolveIcon } from '../../core/search.js'
import type { ApplyIconInput } from '../../core/types.js'

export function handleApplyIcon(args: ApplyIconInput) {
  const resolved = resolveIcon(
    loadIndex(),
    args.name,
    suggestion => ` Call apply_icon again with name="${suggestion}".`
  )
  if ('error' in resolved) return resolved
  const { icon } = resolved

  const result = generateCode(icon, args)
  if ('error' in result) return result

  return {
    ...result,
    // Echo back key info so the agent can confirm what was applied
    meta: {
      name: icon.name,
      weight: args.weight,
      framework: args.framework,
      size: args.size ?? 24
    }
  }
}
