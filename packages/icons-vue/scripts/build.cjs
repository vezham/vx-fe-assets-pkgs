#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-vue` Vue 3 package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-vue
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const fs = require('fs')
const path = require('path')
const {
  buildPreviewDataUri,
  collectIcons,
  escapeForJS
} = require('../../icons-data/build-assets.cjs')
const { loadIconData } = require('../../icons-data/icon-source.cjs')

// ── paths ──────────────────────────────────────────────────────────────────
const SRC = path.join(__dirname, '..', 'src')
const DIST = path.join(__dirname, '..', 'dist')

// ── read data ──────────────────────────────────────────────────────────────
console.log('Reading the SVG catalog …')
const data = loadIconData()

const icons = collectIcons(data)

icons.sort((a, b) => a.pascal.localeCompare(b.pascal))
console.log(`Found ${icons.length} icons`)

// ── clean & prepare dist/icons ──────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true })

// ── individual icon files ──────────────────────────────────────────────────
console.log('Generating Vue component files in dist/icons/ …')

const barrelExports = []
const dtsExports = []

for (const icon of icons) {
  const wEntries = Object.entries(icon.weights)
    .map(([k, v]) => `  ${k}: \`${escapeForJS(v)}\``)
    .join(',\n')

  const previewUri = buildPreviewDataUri(icon.weights, false)
  const kebab = icon.kebab

  // ── icon .js file ──
  const iconJS = `import createIcon from '../createIcon.js';

/**
 * @component
 * @name ${icon.pascal}
 * @description Vezham Vue icon component, renders an SVG Element.
 * @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
 * @see https://vezham.com/docs — Documentation
 */
const ${icon.pascal} = createIcon('${icon.pascal}', {
${wEntries}
});

export { ${icon.pascal} };
export default ${icon.pascal};
`

  fs.writeFileSync(path.join(DIST, 'icons', `${icon.pascal}.js`), iconJS)

  // ── icon .d.ts file ──
  const iconDTS = `import { IconComponent } from '../createIcon';

/**
 * @component
 * @name ${icon.pascal}
 * @description Vezham Vue icon component, renders an SVG Element.
 * @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
 * @see https://vezham.com/docs — Documentation
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
  description: `Vue 3 icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
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
    vue: '^3.0.0'
  },
  keywords: [
    'icons',
    'vue',
    'vue3',
    'vue-icons',
    'svg-icons',
    'icon-library',
    'outline',
    'filled',
    'tree-shakeable',
    'typescript'
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
console.log(`  cd dist && npm publish --access public`)
