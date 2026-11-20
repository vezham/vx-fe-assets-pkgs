#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-react` React package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-react
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const path = require('path')
const { buildFactoryPackage } = require('../../icons-data/build-assets.cjs')

buildFactoryPackage(path.join(__dirname, '..'), {
  title: 'React',
  description: 'Vezham SVG icon component, renders SVG Element with children.',
  attrs: 'SVG attribute',
  client: true,
  esmTypes: true,
  keywords: [
    'icons',
    'react',
    'react-icons',
    'svg-icons',
    'icon-library',
    'outline',
    'filled',
    'tree-shakeable',
    'typescript'
  ],
  runtimeFiles: ['createIcon.js', 'createIcon.d.ts', 'svg-elements.js']
})
