#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-vue` Vue 3 package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-vue
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const path = require('path')
const { buildFactoryPackage } = require('../../icons-data/build-assets.cjs')

buildFactoryPackage(path.join(__dirname, '..'), {
  title: 'Vue 3',
  description: 'Vezham Vue icon component, renders an SVG Element.',
  secondaryColor: false,
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
  ]
})
