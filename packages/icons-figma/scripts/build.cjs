#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { renderWebview } = require('../../icons-data/build-assets.cjs')

const ROOT = path.join(__dirname, '..')
const TEMPLATE_HTML_PATH = path.join(ROOT, 'src', 'index.html')
const DIST = path.join(ROOT, 'dist')
const OUTPUT_HTML_PATH = path.join(DIST, 'index.html')
const LOGO_PATH = path.join(ROOT, 'icon-light.webp')

console.log('Building Vezham Figma plugin package...')

try {
  if (!fs.existsSync(TEMPLATE_HTML_PATH)) {
    throw new Error(`Template HTML file not found at ${TEMPLATE_HTML_PATH}`)
  }

  fs.rmSync(DIST, { recursive: true, force: true })
  fs.mkdirSync(DIST, { recursive: true })

  execFileSync(
    'node',
    [
      path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
      '-p',
      path.join(ROOT, 'tsconfig.json'),
      '--outDir',
      DIST
    ],
    { cwd: ROOT, stdio: 'inherit' }
  )

  const { html, iconCount } = renderWebview(
    TEMPLATE_HTML_PATH,
    LOGO_PATH,
    'image/webp'
  )

  fs.writeFileSync(OUTPUT_HTML_PATH, html, 'utf-8')

  for (const file of ['manifest.json', 'icon.png']) {
    const source = path.join(ROOT, file)
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(DIST, file))
    }
  }

  const srcPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')
  )
  const pkg = {
    name: srcPkg.name,
    version: srcPkg.version,
    description: srcPkg.description,
    repository: srcPkg.repository,
    bugs: srcPkg.bugs,
    homepage: srcPkg.homepage,
    main: 'code.js',
    files: ['code.js', 'index.html', 'manifest.json', 'icon.png'],
    author: srcPkg.author,
    license: srcPkg.license
  }

  fs.writeFileSync(
    path.join(DIST, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n'
  )

  console.log(`Successfully built ${iconCount} icons into ${DIST}`)
} catch (error) {
  console.error('Error compiling Figma plugin UI:', error)
  process.exit(1)
}
