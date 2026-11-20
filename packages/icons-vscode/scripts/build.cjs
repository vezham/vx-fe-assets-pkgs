#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { renderWebview } = require('../../icons-data/build-assets.cjs')

const TEMPLATE_HTML_PATH = path.join(__dirname, '..', 'src', 'index.html')
const OUTPUT_HTML_PATH = path.join(__dirname, '..', 'dist', 'index.html')
const LOGO_PATH = path.join(__dirname, '..', 'resources', 'icon.png')

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

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_HTML_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_HTML_PATH, html, 'utf-8')
  fs.rmSync(path.join(outputDir, 'ui.html'), { force: true })
  console.log(
    `Successfully compiled ${iconCount} icons directly into ${OUTPUT_HTML_PATH}`
  )
} catch (error) {
  console.error('Error compiling VS Code extension UI:', error)
  process.exit(1)
}
