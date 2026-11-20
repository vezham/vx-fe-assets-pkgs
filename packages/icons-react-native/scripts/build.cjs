#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons-react-native` package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons-react-native
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const path = require('path')
const { buildFactoryPackage } = require('../../icons-data/build-assets.cjs')

buildFactoryPackage(path.join(__dirname, '..'), {
  title: 'React Native',
  esmTypes: true,
  description: 'Vezham React Native SVG icon component',
  attrs: 'react-native-svg props',
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
  absolutePublishPath: true
})
