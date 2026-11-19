#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-react-native` package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-react-native
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const fs = require('fs')
const path = require('path')
const {
  loadIconData,
  normalizeSvgColors
} = require('../../icons-data/icon-source.cjs')

// ── paths ──────────────────────────────────────────────────────────────────
const SRC = path.join(__dirname, '..', 'src')
const DIST = path.join(__dirname, '..', 'dist')

// ── weight short keys ──────────────────────────────────────────────────────
const W_KEY = {
  outline: 'O',
  filled: 'F',
  'duotone-outline': 'DO',
  'duotone-filled': 'DF'
}

// ── helpers ────────────────────────────────────────────────────────────────
function toPascalCase(str) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function stripSvgWrapper(code) {
  if (!code) return ''
  return code
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
}

// Normalize legacy hardcoded icon colors so user color props work correctly.
function rewriteColors(svg) {
  return normalizeSvgColors(svg)
}

function escapeForJS(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/**
 * Build a base64 data URI for an inline SVG preview (shown in IDE hover).
 */
function buildPreviewDataUri(weights) {
  const inner = weights.O || weights.F || weights.DO || weights.DF || ''
  if (!inner) return ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">${inner}</svg>`
      .replace(/currentColor/g, '#e4e4e7')
      .replace(/__RI_SECONDARY__/g, '#9ca3af')
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ── read data ──────────────────────────────────────────────────────────────
console.log('Reading the SVG catalog …')
const data = loadIconData()

// ── collect icons ──────────────────────────────────────────────────────────
const icons = []
const pascalLowerSet = new Set()

for (const [catKey, catData] of Object.entries(data.categories || {})) {
  for (const [iconKey, icon] of Object.entries(catData.icons || {})) {
    let pascal = toPascalCase(iconKey)

    if (pascalLowerSet.has(pascal.toLowerCase())) {
      pascal += toPascalCase(catKey)
    }
    pascalLowerSet.add(pascal.toLowerCase())

    const weights = {}
    for (const [wName, wData] of Object.entries(icon.weights || {})) {
      const short = W_KEY[wName]
      if (short && wData.code) {
        weights[short] = rewriteColors(stripSvgWrapper(wData.code))
      }
    }

    if (Object.keys(weights).length > 0) {
      icons.push({
        kebab: iconKey,
        pascal,
        category: catKey,
        weights,
        tags: icon.description || []
      })
    }
  }
}

icons.sort((a, b) => a.pascal.localeCompare(b.pascal))
console.log(`Found ${icons.length} icons`)

// ── clean & prepare dist/icons ──────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true })

// ── individual icon files ──────────────────────────────────────────────────
console.log('Generating React Native component files in dist/icons/ …')

const barrelExports = []
const dtsExports = []

for (const icon of icons) {
  const wEntries = Object.entries(icon.weights)
    .map(([k, v]) => `  ${k}: \`${escapeForJS(v)}\``)
    .join(',\n')

  const previewUri = buildPreviewDataUri(icon.weights)
  const kebab = icon.kebab

  // ── icon .js file with JSDoc ──
  const iconJS = `import createIcon from '../createIcon.js';

/**
 * @component
 * @name ${icon.pascal}
 * @description Vezham React Native SVG icon component
 * @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
 * @see https://vezham.com/docs — Documentation
 * @param {import('../createIcon').IconProps} props — Vezham icon props and any valid react-native-svg props
 * @returns {JSX.Element} JSX Element
 */
const ${icon.pascal} = createIcon('${icon.pascal}', {
${wEntries}
});

export { ${icon.pascal} };
export default ${icon.pascal};
`

  fs.writeFileSync(path.join(DIST, 'icons', `${icon.pascal}.js`), iconJS)

  // ── icon .d.ts file with JSDoc ──
  const iconDTS = `import { IconComponent } from '../createIcon';

/**
 * @component
 * @name ${icon.pascal}
 * @description Vezham React Native SVG icon component
 * @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
 * @see https://vezham.com/docs — Documentation
 * @param {import('../createIcon').IconProps} props — Vezham icon props and any valid react-native-svg props
 * @returns {JSX.Element} JSX Element
 */
declare const ${icon.pascal}: IconComponent;
export { ${icon.pascal} };
export default ${icon.pascal};
`

  fs.writeFileSync(path.join(DIST, 'icons', `${icon.pascal}.d.ts`), iconDTS)

  barrelExports.push(
    `export { ${icon.pascal} } from './icons/${icon.pascal}.js';`
  )
  dtsExports.push(`export { ${icon.pascal} } from './icons/${icon.pascal}.js';`)
}

// ── index.js (ESM barrel in src/) ──────────────────────────────────────────
const indexJS = `// Auto-generated barrel — do not edit
export { createIcon } from './createIcon.js';

${barrelExports.join('\n')}
`

fs.writeFileSync(path.join(DIST, 'index.js'), indexJS)

// ── index.d.ts (types in src/) ─────────────────────────────────────────────
const indexDTS = `// Auto-generated — do not edit
export { createIcon, IconProps, IconWeight, IconComponent } from './createIcon';

${dtsExports.join('\n')}
`

fs.writeFileSync(path.join(DIST, 'index.d.ts'), indexDTS)

// ── clean & prepare dist ───────────────────────────────────────────────────
console.log('Copying runtime helpers to dist/ …')
// ── copy src files to dist ─────────────────────────────────────────────────
fs.copyFileSync(
  path.join(SRC, 'createIcon.js'),
  path.join(DIST, 'createIcon.js')
)
fs.copyFileSync(
  path.join(SRC, 'createIcon.d.ts'),
  path.join(DIST, 'createIcon.d.ts')
)

// ── package.json ───────────────────────────────────────────────────────────
const srcPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
)
const pkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  type: 'module',
  description: `React Native icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': {
      import: './index.js',
      types: './index.d.ts'
    },
    './icons/*': {
      import: './icons/*.js',
      types: './icons/*.d.ts'
    },
    './createIcon': {
      import: './createIcon.js',
      types: './createIcon.d.ts'
    }
  },
  sideEffects: false,
  files: [
    'index.js',
    'index.d.ts',
    'createIcon.js',
    'createIcon.d.ts',
    'icons/'
  ],
  peerDependencies: {
    react: '>=16.8.0',
    'react-native': '>=0.64.0',
    'react-native-svg': '>=12.0.0'
  },
  keywords: [
    'icons',
    'react-native',
    'react-native-icons',
    'svg-icons',
    'icon-library',
    'outline',
    'filled',
    'tree-shakeable',
    'typescript',
    'mobile',
    'ios',
    'android'
  ],
  repository: srcPkg.repository,
  bugs: srcPkg.bugs,
  homepage: 'https://vezham.com'
}

fs.writeFileSync(
  path.join(DIST, 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n'
)

// ── icon name map (for documentation / search) ────────────────────────────
const nameMap = {}
for (const icon of icons) {
  nameMap[icon.kebab] = icon.pascal
}
fs.writeFileSync(
  path.join(DIST, 'icon-names.json'),
  JSON.stringify(nameMap, null, 2)
)

// ── summary ────────────────────────────────────────────────────────────────
const totalFiles = icons.length * 2 + 5
console.log(`\nDone!`)
console.log(`  Icons:       ${icons.length}`)
console.log(
  `  Weights:     outline + filled + duotone-outline + duotone-filled`
)
console.log(`  Files:       ${totalFiles}`)
console.log(`  Output:      ${DIST}`)
console.log(`\nTo publish:`)
console.log(`  cd ${DIST} && npm publish --access public`)
