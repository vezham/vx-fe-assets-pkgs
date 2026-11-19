#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const {
  loadIconData,
  normalizeSvgColors
} = require('../../icons-data/icon-source.cjs')

const ROOT = path.join(__dirname, '..')
const DIST_DATA = path.join(ROOT, 'dist', 'data')
const DIST_INDEX = path.join(DIST_DATA, 'icon-index.json')

function generateTags(name, description) {
  const tags = new Set()
  for (const t of description) tags.add(t)
  const parts = name.split('-')
  for (const part of parts) {
    if (part.length > 1) tags.add(part)
  }
  return [...tags]
}

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

function rewriteColors(svg) {
  return normalizeSvgColors(svg)
}

function buildIndex(data) {
  const icons = []
  const categorySet = new Set()
  const pascalLowerSet = new Set()

  for (const [catKey, catData] of Object.entries(data.categories || {})) {
    categorySet.add(catKey)

    for (const [iconKey, icon] of Object.entries(catData.icons || {})) {
      let pascal = toPascalCase(iconKey)

      if (pascalLowerSet.has(pascal.toLowerCase())) {
        pascal += toPascalCase(catKey)
      }
      pascalLowerSet.add(pascal.toLowerCase())

      const weights = {}

      for (const wName of [
        'outline',
        'filled',
        'duotone-outline',
        'duotone-filled'
      ]) {
        const wData = icon.weights?.[wName]
        if (wData?.code) {
          weights[wName] = {
            code: rewriteColors(stripSvgWrapper(wData.code)),
            viewBox: '0 0 24 24'
          }
        }
      }

      if (Object.keys(weights).length > 0) {
        icons.push({
          name: iconKey,
          pascal,
          category: catKey,
          tags: generateTags(iconKey, icon.description || []),
          weights
        })
      }
    }
  }

  icons.sort((a, b) => a.name.localeCompare(b.name))

  return {
    icons,
    categories: [...categorySet].sort()
  }
}

console.log('Building vezham-icons-mcp …')

const data = loadIconData()
const index = buildIndex(data)

fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true })
fs.mkdirSync(DIST_DATA, { recursive: true })
fs.writeFileSync(DIST_INDEX, JSON.stringify(index) + '\n')

console.log(`Wrote ${index.icons.length} icons to icon-index.json`)

execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'],
  {
    cwd: ROOT,
    stdio: 'inherit'
  }
)

const srcPkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')
)
const pkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  type: 'module',
  description: 'MCP server and CLI for browsing and applying Vezham icons.',
  bin: {
    'vezham-icons-mcp': 'bin/run.cjs'
  },
  main: './server/index.js',
  types: './server/index.d.ts',
  exports: {
    '.': {
      import: './server/index.js',
      types: './server/index.d.ts'
    }
  },
  files: ['bin', 'cli', 'server', 'core', 'data'],
  keywords: ['icons', 'mcp', 'model-context-protocol', 'svg'],
  repository: srcPkg.repository,
  homepage: 'https://vezham.com',
  bugs: srcPkg.bugs,
  dependencies: srcPkg.dependencies,
  engines: {
    node: '>=18'
  }
}

fs.writeFileSync(
  path.join(ROOT, 'dist', 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n'
)
fs.cpSync(path.join(ROOT, 'bin'), path.join(ROOT, 'dist', 'bin'), {
  recursive: true
})
fs.chmodSync(path.join(ROOT, 'dist', 'bin', 'run.cjs'), 0o755)

console.log('vezham-icons-mcp build complete')
