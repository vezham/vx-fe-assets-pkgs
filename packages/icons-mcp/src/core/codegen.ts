import type {
  ApplyIconInput,
  ApplyIconOutput,
  IconEntry,
  IconWeight
} from './types.js'

function weightProp(weight: IconWeight): string {
  if (weight === 'outline') return ''
  return ` weight="${weight}"`
}

function sizeProp(
  size: number,
  framework: ApplyIconInput['framework']
): string {
  if (framework === 'vue') return ` :size="${size}"`
  if (framework === 'html') return ` size="${size}"`
  if (
    framework === 'svelte' ||
    framework === 'react' ||
    framework === 'react-native'
  )
    return ` size={${size}}`
  return ` width="${size}" height="${size}"`
}

function colorProp(
  color: string,
  framework: ApplyIconInput['framework']
): string {
  if (
    framework === 'svelte' ||
    framework === 'react' ||
    framework === 'react-native'
  ) {
    return ` color={${JSON.stringify(color)}}`
  }
  const escaped = color
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
  return ` color="${escaped}"`
}

export function generateCode(
  icon: IconEntry,
  input: ApplyIconInput
): ApplyIconOutput | { error: string } {
  const size = input.size ?? 24
  const color = input.color ?? 'currentColor'
  const component = input.componentName ?? icon.pascal
  const weight = input.weight
  const weightData = icon.weights[weight]
  const hasColor = input.color !== undefined

  if (!weightData) {
    return { error: `Icon "${icon.name}" does not have a ${weight} weight.` }
  }

  const colorAttr = (framework: ApplyIconInput['framework']) =>
    hasColor ? colorProp(color, framework) : ''

  switch (input.framework) {
    case 'react':
    case 'react-native':
    case 'vue':
    case 'svelte': {
      const framework = input.framework
      if (!/^[A-Z_$][\w$]*$/.test(component)) {
        return {
          error: 'Component names must be valid JSX component identifiers.'
        }
      }
      const importStatement = `import ${component} from '@vezham/icons-${framework}/${icon.pascal}';`
      const props = [
        sizeProp(size, framework),
        colorAttr(framework),
        weightProp(weight)
      ].join('')
      const docsSnippet = `<${component}${props} />`
      return { importStatement, docsSnippet }
    }
    case 'html': {
      const importStatement =
        '<script src="https://unpkg.com/@vezham/icons@latest/dist/cdn/vezham-icons.js"></script>'
      const props = [
        ` icon="${icon.name}"`,
        sizeProp(size, 'html'),
        colorAttr('html'),
        weightProp(weight)
      ].join('')
      const docsSnippet = `<vx-icon${props}></vx-icon>`
      return { importStatement, docsSnippet }
    }
    case 'svg': {
      const importStatement = ''
      const docsSnippet = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${weightData.viewBox}" fill="none">${weightData.code}</svg>`
      return { importStatement, docsSnippet }
    }
    default:
      return { error: `Unknown framework: ${input.framework}` }
  }
}

export function buildSvgMarkup(
  icon: IconEntry,
  weight: IconWeight
): string | { error: string } {
  const weightData = icon.weights[weight]
  if (!weightData) {
    return { error: `Icon "${icon.name}" does not have a ${weight} weight.` }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${weightData.viewBox}" fill="none">${weightData.code}</svg>`
}
