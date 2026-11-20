#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { buildWebviewData } = require('../../icons-data/build-assets.cjs')

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

  const { compactData, categoriesList } = buildWebviewData()

  // Load logo as base64
  let logoBase64 = ''
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  }

  // Read the HTML template
  let templateContent = fs.readFileSync(TEMPLATE_HTML_PATH, 'utf-8')

  // Replace placeholders
  templateContent = templateContent.replace(
    /__VEZHAM_ICONS_LOGO_BASE64__/g,
    logoBase64
  )

  // Create inline scripts
  const inlineScripts = `
  <script>
    window.VEZHAM_ICONS_DATA = ${JSON.stringify(compactData)};
    window.VEZHAM_ICONS_CATEGORIES = ${JSON.stringify(categoriesList)};
  </script>
  `

  // Inject before the closing </head> or at placeholder
  if (templateContent.includes('<!-- INJECT_ICONS_DATA -->')) {
    templateContent = templateContent.replace(
      '<!-- INJECT_ICONS_DATA -->',
      inlineScripts
    )
  } else {
    templateContent = templateContent.replace(
      '</head>',
      `${inlineScripts}\n</head>`
    )
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_HTML_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_HTML_PATH, templateContent, 'utf-8')
  fs.rmSync(path.join(outputDir, 'ui.html'), { force: true })
  console.log(
    `Successfully compiled ${Object.keys(compactData).length} icons directly into ${OUTPUT_HTML_PATH}`
  )
} catch (error) {
  console.error('Error compiling VS Code extension UI:', error)
  process.exit(1)
}
