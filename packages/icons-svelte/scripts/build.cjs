#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-svelte` Svelte package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-svelte
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const fs = require('fs')
const path = require('path')
const {
  buildPreviewDataUri,
  collectIcons
} = require('../../icons-data/build-assets.cjs')
const { loadIconData } = require('../../icons-data/icon-source.cjs')

// ── paths ──────────────────────────────────────────────────────────────────
const SRC = path.join(__dirname, '..', 'src')
const DIST = path.join(__dirname, '..', 'dist')

function escapeForJS(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\$\{/g, '\\${')
}

// ── read data ──────────────────────────────────────────────────────────────
console.log('Reading the SVG catalog …')
const data = loadIconData()

const RESERVED_EXPORT_NAMES = [
  'icon',
  'createicon',
  'iconprops',
  'iconweight',
  'iconcomponent',
  'iconoptions',
  'iconfunction'
]
const icons = collectIcons(data, RESERVED_EXPORT_NAMES)

icons.sort((a, b) => a.pascal.localeCompare(b.pascal))
console.log(`Found ${icons.length} icons`)

// ── clean & prepare src ────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true })

// ── individual icon files ──────────────────────────────────────────────────
console.log('Generating Svelte components in dist/icons/ …')

const barrelExports = []
const dtsExports = []

for (const icon of icons) {
  const wEntries = Object.entries(icon.weights)
    .map(([k, v]) => `    ${k}: \`${escapeForJS(v)}\``)
    .join(',\n')

  const previewUri = buildPreviewDataUri(icon.weights, false)
  const kebab = icon.kebab

  // ── icon .svelte file ──
  const iconSvelte = `<script>
  import Icon from '../Icon.svelte';
  export let size = 24;
  export let color = undefined;
  export let weight = 'outline';
  export let strokeWidth = undefined;

  const iconData = {
${wEntries}
  };
</script>

<!--
  @component
  @name ${icon.pascal}
  @description Vezham Svelte icon component, renders an SVG Element.
  @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
  @see https://vezham.com/docs — Documentation
-->
<Icon {size} {color} {weight} {strokeWidth} {iconData} {...$$restProps} />
`

  fs.writeFileSync(
    path.join(DIST, 'icons', `${icon.pascal}.svelte`),
    iconSvelte
  )

  // ── icon .svelte.d.ts file ──
  const iconDTS = `import { SvelteComponent } from 'svelte';
import { IconProps } from '../index';

/**
 * @component
 * @name ${icon.pascal}
 * @description Vezham Svelte icon component, renders an SVG Element.
 * @preview ![${icon.pascal}](${previewUri}) - https://vezham.com/icons/${kebab}
 * @see https://vezham.com/docs — Documentation
 */
export default class ${icon.pascal} extends SvelteComponent<IconProps, any, any> {}
`

  fs.writeFileSync(
    path.join(DIST, 'icons', `${icon.pascal}.svelte.d.ts`),
    iconDTS
  )

  barrelExports.push(
    `export { default as ${icon.pascal} } from './icons/${icon.pascal}.svelte';`
  )
  dtsExports.push(
    `export { default as ${icon.pascal} } from './icons/${icon.pascal}.svelte';`
  )
}

// ── index.js (ESM barrel in src/) ──────────────────────────────────────────
const indexJS = `// Auto-generated barrel — do not edit
export { default as Icon } from './Icon.svelte';

${barrelExports.join('\n')}
`

fs.writeFileSync(path.join(DIST, 'index.js'), indexJS)

// ── index.d.ts (types in src/) ─────────────────────────────────────────────
const indexDTS = `// Auto-generated — do not edit
import { SvelteComponent } from 'svelte';

export interface IconProps {
  /** Primary icon color. Default: inherits from CSS */
  color?: string;
  /** Icon size (px when number, or any CSS unit). Default: \`24\` */
  size?: number | string;
  /** Icon weight / style. Default: \`outline\` */
  weight?: 'outline' | 'filled' | 'duotone-outline' | 'duotone-filled';
  /** Override stroke-width on stroked weights */
  strokeWidth?: number | string;
  // allow other standard SVG/HTML attributes
  [key: string]: any;
}

export declare class Icon extends SvelteComponent<IconProps, any, any> {}

${dtsExports.join('\n')}
`

fs.writeFileSync(path.join(DIST, 'index.d.ts'), indexDTS)

// ── clean & prepare dist ───────────────────────────────────────────────────
console.log('Copying runtime helpers to dist/ …')
// ── copy src files to dist ─────────────────────────────────────────────────
fs.copyFileSync(path.join(SRC, 'Icon.svelte'), path.join(DIST, 'Icon.svelte'))
fs.copyFileSync(
  path.join(SRC, 'Icon.svelte.d.ts'),
  path.join(DIST, 'Icon.svelte.d.ts')
)

// ── package.json ───────────────────────────────────────────────────────────
const srcPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
)
const pkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  type: 'module',
  description: `Svelte icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
  main: './index.js',
  module: './index.js',
  svelte: './index.js',
  types: './index.d.ts',
  exports: {
    '.': {
      types: './index.d.ts',
      svelte: './index.js',
      default: './index.js'
    },
    './icons/*.svelte': {
      types: './icons/*.svelte.d.ts',
      svelte: './icons/*.svelte',
      default: './icons/*.svelte'
    },
    './icons/*': {
      types: './icons/*.svelte.d.ts',
      svelte: './icons/*.svelte',
      default: './icons/*.svelte'
    },
    './Icon.svelte': {
      types: './Icon.svelte.d.ts',
      svelte: './Icon.svelte',
      default: './Icon.svelte'
    }
  },
  sideEffects: false,
  files: [
    'index.js',
    'index.d.ts',
    'Icon.svelte',
    'Icon.svelte.d.ts',
    'icons/'
  ],
  peerDependencies: {
    svelte: '>=3.0.0'
  },
  keywords: [
    'icons',
    'svelte',
    'svelte3',
    'svelte4',
    'svelte5',
    'svelte-icons',
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

// ── icon name map ──────────────────────────────────────────────────────────
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
