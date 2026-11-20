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
  distExports,
  finishBuild,
  prepareBuild,
  writeIconEntries,
  writePackageJson
} = require('../../icons-data/build-assets.cjs')

// ── paths ──────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')

function escapeForJS(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\$\{/g, '\\${')
}

const RESERVED_EXPORT_NAMES = [
  'icon',
  'createicon',
  'iconprops',
  'iconweight',
  'iconcomponent',
  'iconoptions',
  'iconfunction'
]
const { icons } = prepareBuild(DIST, RESERVED_EXPORT_NAMES)

// ── individual icon files ──────────────────────────────────────────────────
console.log('Generating Svelte components in dist/icons/ …')

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
import type { IconProps } from '../index.js';

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
}

const types = `import { SvelteComponent } from 'svelte';

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
`
writeIconEntries(DIST, SRC, icons, {
  runtime: "export { default as Icon } from './Icon.svelte';",
  types: types.trimEnd(),
  exportName: icon => `default as ${icon.pascal}`,
  extension: 'svelte',
  runtimeFiles: ['Icon.svelte', 'Icon.svelte.d.ts']
})

// ── package.json ───────────────────────────────────────────────────────────
const sourcePackage = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
)
writePackageJson(ROOT, DIST, {
  description: `Svelte icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
  main: './index.js',
  module: './index.js',
  svelte: './index.js',
  types: './index.d.ts',
  exports: distExports(sourcePackage.exports),
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
  ]
})

finishBuild(DIST, icons, icons.length * 2 + 5)
