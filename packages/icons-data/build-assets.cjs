const { loadIconData, normalizeSvgColors } = require('./icon-source.cjs')

const shortWeights = {
  outline: 'O',
  filled: 'F',
  'duotone-outline': 'DO',
  'duotone-filled': 'DF'
}

const toPascalCase = value =>
  value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const collectIcons = (data, reservedNames = []) => {
  const usedNames = new Set(reservedNames)
  const icons = []
  for (const [category, { icons: entries }] of Object.entries(
    data.categories
  )) {
    for (const [kebab, icon] of Object.entries(entries)) {
      const name = toPascalCase(kebab)
      const pascal = usedNames.has(name.toLowerCase())
        ? name + toPascalCase(category)
        : name
      usedNames.add(pascal.toLowerCase())
      const weights = {}
      for (const [weight, { code }] of Object.entries(icon.weights)) {
        if (shortWeights[weight] && code) {
          weights[shortWeights[weight]] = normalizeSvgColors(
            code
              .replace(/^<svg[^>]*>/, '')
              .replace(/<\/svg>\s*$/, '')
              .trim()
          )
        }
      }
      if (Object.keys(weights).length) {
        icons.push({
          kebab,
          pascal,
          category,
          weights,
          tags: icon.description || [],
          contributor: icon.contributor || null
        })
      }
    }
  }
  return icons
}

const escapeForJS = value =>
  value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const buildPreviewDataUri = (weights, useSecondaryColor = true) => {
  const inner = weights.O || weights.F || weights.DO || weights.DF
  if (!inner) return ''
  const preview = inner.replace(/currentColor/g, '#e4e4e7')
  const content = useSecondaryColor
    ? preview.replace(/__RI_SECONDARY__/g, '#9ca3af')
    : preview
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">${content}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const buildWebviewData = () => {
  const compactData = {}
  const categoriesList = []
  for (const [category, group] of Object.entries(loadIconData().categories)) {
    categoriesList.push({
      id: category,
      name: group.name || category.charAt(0).toUpperCase() + category.slice(1)
    })
    for (const [slug, icon] of Object.entries(group.icons)) {
      const weights = {}
      for (const [weight, { code }] of Object.entries(icon.weights)) {
        if (code) weights[weight] = code
      }
      if (Object.keys(weights).length) {
        compactData[slug] = {
          category,
          weights,
          description: icon.description || []
        }
      }
    }
  }
  return { compactData, categoriesList }
}

module.exports = {
  buildPreviewDataUri,
  buildWebviewData,
  collectIcons,
  escapeForJS
}
