const fs = require('node:fs')
const path = require('node:path')
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

const renderWebview = (templatePath, logoPath, mimeType) => {
  const { compactData, categoriesList } = buildWebviewData()
  const logo = fs.existsSync(logoPath)
    ? `data:${mimeType};base64,${fs.readFileSync(logoPath).toString('base64')}`
    : ''
  const template = fs
    .readFileSync(templatePath, 'utf8')
    .replace(/__VEZHAM_ICONS_LOGO_BASE64__/g, logo)
  const dataScript = `
  <script>
    window.VEZHAM_ICONS_DATA = ${JSON.stringify(compactData)};
    window.VEZHAM_ICONS_CATEGORIES = ${JSON.stringify(categoriesList)};
  </script>
  `
  const marker = '<!-- INJECT_ICONS_DATA -->'
  const html = template.includes(marker)
    ? template.replace(marker, dataScript)
    : template.replace('</head>', `${dataScript}\n</head>`)
  return { html, iconCount: Object.keys(compactData).length }
}

const prepareBuild = (dist, reservedNames) => {
  console.log('Reading the SVG catalog …')
  const data = loadIconData()
  const icons = collectIcons(data, reservedNames).sort((a, b) =>
    a.pascal.localeCompare(b.pascal)
  )
  console.log(`Found ${icons.length} icons`)
  fs.rmSync(dist, { recursive: true, force: true })
  fs.mkdirSync(path.join(dist, 'icons'), { recursive: true })
  return { data, icons }
}

const writeIconEntries = (
  dist,
  src,
  icons,
  {
    runtime = "export { createIcon } from './createIcon.js';",
    types,
    exportName = icon => icon.pascal,
    extension = 'js',
    runtimeFiles
  }
) => {
  const exports = icons
    .map(
      icon =>
        `export { ${exportName(icon)} } from './icons/${icon.pascal}.${extension}';`
    )
    .join('\n')
  fs.writeFileSync(
    path.join(dist, 'index.js'),
    `// Auto-generated barrel — do not edit\n${runtime}\n\n${exports}\n`
  )
  fs.writeFileSync(
    path.join(dist, 'index.d.ts'),
    `// Auto-generated — do not edit\n${types}\n\n${exports}\n`
  )
  console.log('Copying runtime helpers to dist/ …')
  for (const name of runtimeFiles) {
    fs.copyFileSync(path.join(src, name), path.join(dist, name))
  }
}

const factoryRuntime = ['createIcon.js', 'createIcon.d.ts']

const writeFactoryIcons = (
  dist,
  src,
  icons,
  {
    description,
    attrs,
    client,
    secondaryColor,
    vanilla,
    runtimeFiles = factoryRuntime
  }
) => {
  const type = vanilla ? 'IconFunction' : 'IconComponent'
  const declarationImport = vanilla ? '../createIcon.js' : '../createIcon'
  for (const { pascal, kebab, weights } of icons) {
    const preview = buildPreviewDataUri(weights, secondaryColor)
    const help = [
      '/**',
      ...(!vanilla ? [' * @component'] : []),
      ` * @name ${pascal}`,
      ` * @description ${description}`,
      ` * @preview ![${pascal}](${preview}) - https://vezham.com/icons/${kebab}`
    ]
    const docs = declaration => {
      const vanillaJs = vanilla && !declaration
      const dash = vanillaJs ? '-' : '—'
      const optionsImport = vanillaJs ? '../createIcon' : declarationImport
      return [
        ...help,
        ` * @see https://vezham.com/docs ${dash} Documentation`,
        ...(vanilla
          ? [
              ` * @param {import('${optionsImport}').IconOptions} [options] ${dash} Icon options`,
              ' * @returns {SVGSVGElement} SVG Element'
            ]
          : attrs
            ? [
                ` * @param {import('../createIcon').IconProps} props — Vezham icon props and any valid ${attrs}`,
                ' * @returns {JSX.Element} JSX Element'
              ]
            : []),
        ' */'
      ].join('\n')
    }
    const weightEntries = Object.entries(weights)
      .map(([key, value]) => `  ${key}: \`${escapeForJS(value)}\``)
      .join(',\n')
    const exports = `export { ${pascal} };\nexport default ${pascal};\n`
    const directive = client ? "'use client';\n" : ''
    fs.writeFileSync(
      path.join(dist, 'icons', pascal + '.js'),
      `${directive}import createIcon from '../createIcon.js';\n\n${docs(false)}\nconst ${pascal} = createIcon('${pascal}', {\n${weightEntries}\n});\n\n${exports}`
    )
    fs.writeFileSync(
      path.join(dist, 'icons', pascal + '.d.ts'),
      `import${vanilla ? ' type' : ''} { ${type} } from '${declarationImport}';\n\n${docs(true)}\ndeclare const ${pascal}: ${type};\n${exports}`
    )
  }

  const types = vanilla
    ? "export { createIcon } from './createIcon.js';\nexport type { IconOptions, IconWeight, IconFunction } from './createIcon.js';"
    : "export { createIcon, IconProps, IconWeight, IconComponent } from './createIcon';"
  writeIconEntries(dist, src, icons, { types, runtimeFiles })
}

const writePackageJson = (root, dist, fields) => {
  const { name, version, repository, bugs } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  )
  const manifest = {
    name,
    version,
    type: 'module',
    ...fields,
    repository,
    bugs,
    homepage: 'https://vezham.com'
  }
  fs.writeFileSync(
    path.join(dist, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  )
}

const finishBuild = (dist, icons, totalFiles, publishPath = 'dist') => {
  const names = Object.fromEntries(icons.map(icon => [icon.kebab, icon.pascal]))
  fs.writeFileSync(
    path.join(dist, 'icon-names.json'),
    JSON.stringify(names, null, 2)
  )
  console.log('\nDone!')
  console.log(`  Icons:       ${icons.length}`)
  console.log(
    '  Weights:     outline + filled + duotone-outline + duotone-filled'
  )
  console.log(`  Files:       ${totalFiles}`)
  console.log(`  Output:      ${dist}`)
  console.log(
    `\nTo publish:\n  cd ${publishPath} && npm publish --access public`
  )
}

const buildFactoryPackage = (root, options) => {
  const {
    title,
    keywords,
    runtimeFiles = factoryRuntime,
    absolutePublishPath
  } = options
  const dist = path.join(root, 'dist')
  const { icons } = prepareBuild(dist)
  console.log(
    `Generating ${title === 'Vue 3' ? 'Vue' : title} component files in dist/icons/ …`
  )
  writeFactoryIcons(dist, path.join(root, 'src'), icons, options)
  const { dependencies, peerDependencies } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  )
  writePackageJson(root, dist, {
    description: `${title} icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
    main: './index.js',
    module: './index.js',
    types: './index.d.ts',
    exports: {
      '.': { import: './index.js', types: './index.d.ts' },
      './icons/*': { import: './icons/*.js', types: './icons/*.d.ts' },
      './createIcon': { import: './createIcon.js', types: './createIcon.d.ts' }
    },
    sideEffects: false,
    files: ['index.js', 'index.d.ts', ...runtimeFiles, 'icons/'],
    dependencies,
    peerDependencies,
    keywords
  })
  finishBuild(
    dist,
    icons,
    icons.length * 2 + 5,
    absolutePublishPath ? dist : 'dist'
  )
}

module.exports = {
  buildFactoryPackage,
  buildPreviewDataUri,
  escapeForJS,
  finishBuild,
  prepareBuild,
  renderWebview,
  writeFactoryIcons,
  writeIconEntries,
  writePackageJson
}
