#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { renderWebview } = require('../../icons-data/build-assets.cjs')

const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const TEMPLATE_HTML_PATH = path.join(ROOT, 'src', 'index.html')
const LOGO_PATH = path.join(ROOT, 'resources', 'icon.png')

console.log(
  'Compiling Vezham Icons VS Code icons database and inlining into index.html...'
)

try {
  if (!fs.existsSync(TEMPLATE_HTML_PATH)) {
    throw new Error(`Template HTML file not found at ${TEMPLATE_HTML_PATH}`)
  }

  const { html, iconCount } = renderWebview(
    TEMPLATE_HTML_PATH,
    LOGO_PATH,
    'image/png'
  )

  fs.rmSync(DIST, { recursive: true, force: true })
  fs.mkdirSync(DIST, { recursive: true })
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8')
  fs.copyFileSync(
    path.join(ROOT, 'extension.js'),
    path.join(DIST, 'extension.js')
  )
  fs.copyFileSync(LOGO_PATH, path.join(DIST, 'icon.png'))
  fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(DIST, 'README.md'))

  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')
  )
  manifest.name = 'icons'
  manifest.main = './extension.js'
  manifest.icon = 'icon.png'
  manifest.contributes.viewsContainers.activitybar[0].icon = manifest.icon
  manifest.files = ['extension.js', 'icon.png', 'index.html', 'README.md']
  delete manifest.scripts
  delete manifest.devDependencies
  fs.writeFileSync(
    path.join(DIST, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  )
  console.log(
    `Successfully built ${manifest.publisher}.${manifest.name} with ${iconCount} icons into ${DIST}`
  )
} catch (error) {
  console.error('Error compiling VS Code extension UI:', error)
  process.exit(1)
}
