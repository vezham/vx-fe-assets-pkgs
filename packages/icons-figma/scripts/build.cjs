#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { buildWebviewData } = require('../../icons-data/build-assets.cjs')

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

  const { compactData, categoriesList } = buildWebviewData()

  // Load logo as base64
  let logoBase64 = ''
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH)
    logoBase64 = `data:image/webp;base64,${logoBuffer.toString('base64')}`
  }

  // Read the HTML template
  let templateContent = fs.readFileSync(TEMPLATE_HTML_PATH, 'utf-8')

  // Replace logo placeholder
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

  fs.writeFileSync(OUTPUT_HTML_PATH, templateContent, 'utf-8')

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

  console.log(
    `Successfully built ${Object.keys(compactData).length} icons into ${DIST}`
  )
} catch (error) {
  console.error('Error compiling Figma plugin UI:', error)
  process.exit(1)
}
