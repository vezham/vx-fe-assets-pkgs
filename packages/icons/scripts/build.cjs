#!/usr/bin/env node
/**
 * build.cjs — Generates the `@vezham/icons` vanilla JS package from the shared SVG catalog
 *
 * Usage: pnpm nx build icons
 *
 * Output:
 *   dist/             Standard NPM package ready to publish (git-ignored)
 */

const fs = require('fs')
const path = require('path')
const {
  escapeForJS,
  finishBuild,
  prepareBuild,
  writeFactoryIcons,
  writePackageJson
} = require('../../icons-data/build-assets.cjs')

// ── paths ──────────────────────────────────────────────────────────────────
const SRC = path.join(__dirname, '..', 'src')
const DIST = path.join(__dirname, '..', 'dist')

function buildStandaloneSvg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">${inner}</svg>`
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const { data, icons } = prepareBuild(DIST)
console.log('Generating vanilla JS component files in dist/icons/ …')
writeFactoryIcons(DIST, SRC, icons, {
  description: 'Vezham SVG icon function, creates an SVG element.',
  vanilla: true
})

// ── UMD bundle ─────────────────────────────────────────────────────────────
console.log('Generating UMD bundle …')
fs.mkdirSync(path.join(DIST, 'umd'), { recursive: true })

const umdIconEntries = icons
  .map(icon => {
    const wEntries = Object.entries(icon.weights)
      .map(([k, v]) => `    ${k}: \`${escapeForJS(v)}\``)
      .join(',\n')
    return `  ${icon.pascal}: createIcon('${icon.pascal}', {\n${wEntries}\n  })`
  })
  .join(',\n')

const umdBundle = `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.VezhamIcons = {}));
})(this, (function (exports) { 'use strict';

  var W_MAP = {
    outline: 'O',
    filled: 'F',
    'duotone-outline': 'DO',
    'duotone-filled': 'DF'
  };

  function escAttr(v) { return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function createIcon(displayName, iconData) {
    var icon = function(options) {
      options = options || {};
      var color = options.color;
      var size = options.size || 24;
      var weight = options.weight || 'outline';
      var strokeWidth = options.strokeWidth;
      var className = options.className;
      var attrs = options.attrs || {};

      var key = W_MAP[weight] || 'O';
      var html = iconData[key] || iconData[Object.keys(iconData)[0]] || '';

      if (strokeWidth != null) {
        html = html.replace(/stroke-width="[^"]*"/g, function () { return 'stroke-width="' + escAttr(strokeWidth) + '"'; });
      }

      if (typeof document === 'undefined') {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('@vezham/icons: document is not defined when rendering icon "' + displayName + '". Use toSvg() for Server-Side Rendering (SSR).');
        }
        return null;
      }

      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('class', className ? 'vx-icon ' + className : 'vx-icon');
      if (color != null) svg.style.color = color;

      var attrKeys = Object.keys(attrs);
      for (var i = 0; i < attrKeys.length; i++) {
        svg.setAttribute(attrKeys[i], String(attrs[attrKeys[i]]));
      }

      svg.innerHTML = html;
      return svg;
    };

    icon.displayName = displayName;
    icon.iconData = iconData;

    icon.toSvg = function(options) {
      options = options || {};
      var color = options.color;
      var size = options.size || 24;
      var weight = options.weight || 'outline';
      var strokeWidth = options.strokeWidth;
      var className = options.className;
      var attrs = options.attrs || {};

      var key = W_MAP[weight] || 'O';
      var html = iconData[key] || iconData[Object.keys(iconData)[0]] || '';

      if (strokeWidth != null) {
        html = html.replace(/stroke-width="[^"]*"/g, function () { return 'stroke-width="' + escAttr(strokeWidth) + '"'; });
      }

      var extraAttrs = Object.keys(attrs).map(function(k) { return escAttr(k) + '="' + escAttr(attrs[k]) + '"'; }).join(' ');
      var styleAttr = color != null ? ' style="color: ' + escAttr(color) + '"' : '';
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + escAttr(size) + '" height="' + escAttr(size) + '" viewBox="0 0 24 24" fill="none" class="' + escAttr(className ? 'vx-icon ' + className : 'vx-icon') + '"' + styleAttr + (extraAttrs ? ' ' + extraAttrs : '') + '>' + html + '</svg>';
    };

    return icon;
  }

  exports.createIcon = createIcon;

  var icons = {\n${umdIconEntries}\n  };

  var iconNames = Object.keys(icons);
  for (var i = 0; i < iconNames.length; i++) {
    exports[iconNames[i]] = icons[iconNames[i]];
  }

}));
`

fs.writeFileSync(path.join(DIST, 'umd', 'vezham-icons.js'), umdBundle)
console.log(
  `  UMD bundle:  ${(Buffer.byteLength(umdBundle) / 1024 / 1024).toFixed(2)} MB`
)

// ── CDN bundle ─────────────────────────────────────────────────────────────
console.log('Generating CDN bundle …')

const catList = Object.keys(data.categories || {})
const catIndexMap = {}
catList.forEach((c, idx) => {
  catIndexMap[c] = idx
})

const cdnIconsMap = {}
for (const icon of icons) {
  // Format: [categoryIndex, weights, contributorGithub?]
  // contributorGithub is only included when set — keeps bundle size minimal.
  const entry = [catIndexMap[icon.category], icon.weights]
  if (icon.contributor?.github) entry.push(icon.contributor.github)
  cdnIconsMap[icon.kebab] = entry
}

const catsJSON = JSON.stringify(catList)
const iconsJSON = JSON.stringify(cdnIconsMap)

const runtimeJS = `/*!
 * Vezham Icons CDN — drop-in web component for 1000+ icons, 4 weights.
 * ALL icon data is inlined — zero network fetch, instant rendering.
 *
 *   <vx-icon icon="home"></vx-icon>
 *   <vx-icon icon="home" weight="filled" size="32" color="#d97757"></vx-icon>
 *
 * Attributes (all reactive):
 *   icon, weight, size, color, secondary-color, stroke-width,
 *   rotate, flip, spin, loading, label, decorative,
 *   gradient, gradient-type, gradient-angle, secondary-gradient
 *
 * JS API:
 *   VezhamIcons.preload([...names])     warm cache for given icons
 *   VezhamIcons.ready                   Promise (resolves immediately — data is inline)
 *   VezhamIcons.icons                   Array of all icon names
 *   VezhamIcons.categories              Array of all category names
 */
(function (global) {
  'use strict';

  // ─── inline icon data ─────────────────────────────────────────────────────
  var CATS = ${catsJSON};
  var ICONS = ${iconsJSON};

  // Weight short→full and full→short maps
  var W_FULL = { O: 'outline', F: 'filled', DO: 'duotone-outline', DF: 'duotone-filled' };
  var W_SHORT = { outline: 'O', filled: 'F', 'duotone-outline': 'DO', 'duotone-filled': 'DF' };
  var WEIGHTS = ['outline', 'filled', 'duotone-outline', 'duotone-filled'];
  var WEIGHT_ALIASES = {
    filled: 'filled',
    outline: 'outline',
    'duotone-outline': 'duotone-outline',
    'duotone-filled': 'duotone-filled',
  };

  // ─── caches ───────────────────────────────────────────────────────────────
  var SVG_CACHE = new Map();

  // ─── helpers ──────────────────────────────────────────────────────────────
  function normalizeWeight(w) {
    if (!w) return null;
    return WEIGHT_ALIASES[String(w).toLowerCase()] || null;
  }

  function parseIconAttr(raw) {
    if (!raw) return null;
    var category = null, spec = String(raw).trim();
    var name = spec, weight = null;
    for (var i = 0; i < WEIGHTS.length; i++) {
      var suffix = '-' + WEIGHTS[i];
      if (spec.slice(-suffix.length) === suffix) {
        var base = spec.slice(0, -suffix.length);
        if (ICONS[base] && !ICONS[spec]) {
          name = base;
          weight = WEIGHTS[i];
          break;
        }
      }
    }
    return { category: category, name: name, weight: weight };
  }

  function normalizeSize(s) {
    if (s == null || s === '') return null;
    var v = String(s).trim();
    if (/^-?\\d*\\.?\\d+$/.test(v)) return v + 'px';
    return v;
  }

  function buildTransform(rotate, flip) {
    var t = [];
    if (rotate) t.push('rotate(' + rotate + 'deg)');
    if (flip === 'horizontal') t.push('scaleX(-1)');
    else if (flip === 'vertical') t.push('scaleY(-1)');
    else if (flip === 'both') t.push('scale(-1,-1)');
    return t.length ? t.join(' ') : 'none';
  }

  function wrapSvg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' + inner + '</svg>';
  }

  function rewriteSvg(svg) {
    return svg.replace(/currentColor/g, 'var(--vx-icon-primary)');
  }

  // ─── gradients ────────────────────────────────────────────────────────────
  function parseGradientStops(attr) {
    if (!attr) return null;
    var colors = String(attr).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return colors.length >= 2 ? colors : null;
  }

  function buildStops(colors) {
    return colors.map(function (c, i) {
      var offset = colors.length === 1 ? 0 : (i / (colors.length - 1)) * 100;
      return '<stop offset="' + offset.toFixed(2) + '%" stop-color="' + c + '"/>';
    }).join('');
  }

  function buildLinearGradient(id, colors, angleDeg) {
    var rad = (Number(angleDeg) || 0) * Math.PI / 180;
    var sin = Math.sin(rad), cos = Math.cos(rad);
    return '<linearGradient id="' + id + '" x1="' + (0.5 - sin * 0.5).toFixed(4) + '" y1="' + (0.5 + cos * 0.5).toFixed(4) + '" x2="' + (0.5 + sin * 0.5).toFixed(4) + '" y2="' + (0.5 - cos * 0.5).toFixed(4) + '">' + buildStops(colors) + '</linearGradient>';
  }

  function buildRadialGradient(id, colors) {
    return '<radialGradient id="' + id + '" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">' + buildStops(colors) + '</radialGradient>';
  }

  function applyGradients(svg, opts) {
    if (!opts.primary && !opts.secondary) return svg;
    var defs = [], out = svg;
    if (opts.primary) {
      defs.push(opts.type === 'radial' ? buildRadialGradient('vx-icon-primary', opts.primary) : buildLinearGradient('vx-icon-primary', opts.primary, opts.angle));
      out = out.replace(/var\\(--vx-icon-primary\\)/g, 'url(#vx-icon-primary)');
    }
    if (opts.secondary) {
      defs.push(opts.type === 'radial' ? buildRadialGradient('vx-icon-secondary', opts.secondary) : buildLinearGradient('vx-icon-secondary', opts.secondary, opts.angle));
      out = out.replace(/var\\(--vx-icon-secondary\\)/g, 'url(#vx-icon-secondary)');
    }
    return out.replace(/(<svg\\b[^>]*>)/i, '$1<defs>' + defs.join('') + '</defs>');
  }

  var FALLBACK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.6"/>' +
    '<path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>';

  // ─── inline data lookup ───────────────────────────────────────────────────
  function lookupIcon(name, weight) {
    var entry = ICONS[name];
    if (!entry) return null;
    var ws = entry[1];
    var short = W_SHORT[weight];
    if (short && ws[short]) return { cat: CATS[entry[0]], inner: ws[short] };
    var order = ['O', 'F', 'DO', 'DF'];
    for (var i = 0; i < order.length; i++) {
      if (ws[order[i]]) return { cat: CATS[entry[0]], inner: ws[order[i]] };
    }
    return null;
  }

  // ─── intersection observer for loading="lazy" ────────────────────────────
  var lazyObserver = null;
  function lazyObserve(el) {
    if (typeof IntersectionObserver === 'undefined') { el._render(); return; }
    if (!lazyObserver) {
      lazyObserver = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            lazyObserver.unobserve(entries[i].target);
            entries[i].target._render();
          }
        }
      }, { rootMargin: '128px' });
    }
    lazyObserver.observe(el);
  }

  // ─── element ──────────────────────────────────────────────────────────────
  class VezhamIconElement extends HTMLElement {
    static get observedAttributes() {
      return [
        'icon', 'weight', 'size', 'color', 'secondary-color', 'stroke-width',
        'rotate', 'flip', 'spin', 'loading', 'label', 'decorative',
        'gradient', 'gradient-type', 'gradient-angle', 'secondary-gradient',
      ];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._svgEl = null;
      this._currentKey = null;
      this._rendered = false;
      this._mounted = false;
    }

    connectedCallback() {
      this._mounted = true;
      this._installSkeleton();
      this._applyHostStyle();
      if (this.getAttribute('loading') === 'lazy') { lazyObserve(this); }
      else { this._render(); }
    }

    disconnectedCallback() {
      this._mounted = false;
      if (lazyObserver) lazyObserver.unobserve(this);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || !this._mounted) return;
      var styleOnly = ['size', 'color', 'secondary-color', 'stroke-width', 'rotate', 'flip', 'spin', 'label', 'decorative'];
      if (styleOnly.includes(name)) { this._applyHostStyle(); this._applyA11y(); return; }
      var gradientAttrs = ['gradient', 'gradient-type', 'gradient-angle', 'secondary-gradient'];
      if (gradientAttrs.includes(name)) {
        if (this._rawSvg) this._injectProcessed(); else this._render();
        return;
      }
      if (name === 'loading' && newVal === 'lazy' && !this._rendered) { lazyObserve(this); }
      else { this._render(); }
    }

    _installSkeleton() {
      if (this.shadowRoot.firstChild) return;
      var style = document.createElement('style');
      style.textContent =
        ':host{display:inline-block;vertical-align:middle;line-height:0;width:var(--vx-icon-size,1em);height:var(--vx-icon-size,1em);color:var(--vx-icon-primary,currentColor);contain:layout paint}' +
        ':host([hidden]){display:none}' +
        '.wrap{display:block;width:100%;height:100%;transform:var(--vx-icon-transform,none);transform-origin:50% 50%}' +
        ':host([spin]) .wrap{animation:vx-icon-spin 1.6s linear infinite}' +
        '@keyframes vx-icon-spin{to{transform:var(--vx-icon-transform,rotate(0)) rotate(360deg)}}' +
        'svg{display:block;width:100%;height:100%;shape-rendering:geometricPrecision;overflow:visible}' +
        'svg [stroke]:not([stroke="none"]){stroke-width:var(--vx-icon-stroke-width,inherit)}';
      var wrap = document.createElement('div');
      wrap.className = 'wrap';
      this.shadowRoot.append(style, wrap);
      this._wrap = wrap;
    }

    _applyHostStyle() {
      var size = normalizeSize(this.getAttribute('size'));
      var color = this.getAttribute('color') || 'currentColor';
      var secondary = this.getAttribute('secondary-color') || color;
      var stroke = this.getAttribute('stroke-width');
      var rotate = this.getAttribute('rotate');
      var flip = this.getAttribute('flip');
      var s = this.style;
      function set(k, v) { if (v == null || v === '') s.removeProperty(k); else s.setProperty(k, v); }
      set('--vx-icon-size', size);
      set('--vx-icon-primary', color);
      set('--vx-icon-secondary', secondary);
      set('--vx-icon-stroke-width', stroke);
      set('--vx-icon-transform', buildTransform(rotate, flip));
    }

    _applyA11y() {
      if (this.hasAttribute('decorative')) {
        this.setAttribute('aria-hidden', 'true');
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
        return;
      }
      this.removeAttribute('aria-hidden');
      this.setAttribute('role', 'img');
      var label = this.getAttribute('label') || this._lastIconName || '';
      if (label) this.setAttribute('aria-label', label);
    }

    _render() {
      this._installSkeleton();
      this._applyHostStyle();

      var iconAttr = this.getAttribute('icon');
      if (!iconAttr) return;

      var parsed = parseIconAttr(iconAttr);
      if (!parsed) { this._injectSvg(FALLBACK_SVG); return; }

      var weightAttr = normalizeWeight(this.getAttribute('weight'));
      var weight = weightAttr || parsed.weight || 'outline';
      var name = parsed.name;
      this._lastIconName = name;
      this._applyA11y();

      var key = name + ':' + weight;
      if (this._currentKey === key && this._rendered) return;

      var svg = SVG_CACHE.get(key);
      if (!svg) {
        var found = lookupIcon(name, weight);
        if (!found) { this._injectSvg(FALLBACK_SVG); return; }
        svg = rewriteSvg(wrapSvg(found.inner));
        SVG_CACHE.set(key, svg);
      }

      this._currentKey = key;
      this._rawSvg = svg;
      this._injectProcessed();
    }

    _injectProcessed() {
      var primary = parseGradientStops(this.getAttribute('gradient'));
      var secondary = parseGradientStops(this.getAttribute('secondary-gradient'));
      var type = this.getAttribute('gradient-type') || 'linear';
      var angle = this.getAttribute('gradient-angle') || 135;
      var out = (primary || secondary) ? applyGradients(this._rawSvg, { primary: primary, secondary: secondary, type: type, angle: angle }) : this._rawSvg;
      this._injectSvg(out);
    }

    _injectSvg(svg) {
      this._wrap.innerHTML = svg;
      this._rendered = true;
    }
  }

  // ─── public JS API ────────────────────────────────────────────────────────
  var VezhamIcons = {
    preload: function (names) {
      if (!names || !Array.isArray(names)) return;
      for (var i = 0; i < names.length; i++) {
        var n = names[i];
        var entry = ICONS[n];
        if (!entry) continue;
        var ws = entry[1];
        for (var s in ws) {
          if (ws.hasOwnProperty(s)) {
            var full = W_FULL[s];
            if (full) SVG_CACHE.set(n + ':' + full, rewriteSvg(wrapSvg(ws[s])));
          }
        }
      }
    },
    get ready() { return Promise.resolve(true); },
    get icons() { return Object.keys(ICONS); },
    get categories() { return CATS.slice(); },
    categoryOf: function (name) {
      var entry = ICONS[name];
      return entry ? CATS[entry[0]] : null;
    },
    get categoryMap() {
      var m = {};
      for (var n in ICONS) {
        if (ICONS.hasOwnProperty(n)) m[n] = CATS[ICONS[n][0]];
      }
      return m;
    },
    contributorOf: function (name) {
      var entry = ICONS[name];
      // entry[2] is the contributor GitHub username (only present when set)
      return (entry && entry[2]) ? entry[2] : null;
    },
  };

  if (!customElements.get('vx-icon')) {
    customElements.define('vx-icon', VezhamIconElement);
  }
  global.VezhamIcons = VezhamIcons;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VezhamIconElement: VezhamIconElement, VezhamIcons: VezhamIcons };
  }
})(typeof window !== 'undefined' ? window : globalThis);
`

const cdnDist = path.join(DIST, 'cdn')
fs.mkdirSync(cdnDist, { recursive: true })
fs.writeFileSync(path.join(cdnDist, 'vezham-icons.js'), runtimeJS)
console.log(
  `  CDN bundle:  ${(Buffer.byteLength(runtimeJS) / 1024 / 1024).toFixed(2)} MB`
)

// ── direct CDN SVG files ───────────────────────────────────────────────────
const cdnIconsDist = path.join(cdnDist, 'icons')
fs.mkdirSync(cdnIconsDist, { recursive: true })

let directSvgFiles = 0
const directSvgPaths = new Set()
function writeDirectSvg(relativePath, inner) {
  if (directSvgPaths.has(relativePath)) {
    return
  }
  directSvgPaths.add(relativePath)

  const outPath = path.join(cdnIconsDist, relativePath)
  const svg = buildStandaloneSvg(inner)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, svg)
  directSvgFiles++
}

for (const icon of icons) {
  const outline =
    icon.weights.O || icon.weights.F || icon.weights.DO || icon.weights.DF
  if (outline) {
    writeDirectSvg(`${icon.kebab}.svg`, outline)
  }

  if (icon.weights.F) {
    writeDirectSvg(`${icon.kebab}-filled.svg`, icon.weights.F)
  }

  if (icon.weights.DO) {
    writeDirectSvg(`${icon.kebab}-duotone-outline.svg`, icon.weights.DO)
  }

  if (icon.weights.DF) {
    writeDirectSvg(`${icon.kebab}-duotone-filled.svg`, icon.weights.DF)
  }
}
console.log(`  Direct SVGs: ${directSvgFiles}`)

// ── package.json ───────────────────────────────────────────────────────────
writePackageJson(path.join(__dirname, '..'), DIST, {
  description: `Core vanilla JS icon components for ${icons.length}+ icons in 4 weights. Tree-shakeable, TypeScript-ready.`,
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  unpkg: './umd/vezham-icons.js',
  jsdelivr: './umd/vezham-icons.js',
  browser: './umd/vezham-icons.js',
  exports: {
    '.': {
      import: './index.js',
      types: './index.d.ts'
    },
    './*': {
      types: './icons/*.d.ts',
      import: './icons/*.js'
    },
    './createIcon': {
      import: './createIcon.js',
      types: './createIcon.d.ts'
    },
    './umd/vezham-icons.js': {
      import: './umd/vezham-icons.js'
    },
    './cdn/vezham-icons.js': {
      import: './cdn/vezham-icons.js'
    },
    './cdn/icons/*': {
      default: './cdn/icons/*'
    },
    './cdn/*': {
      import: './cdn/*.js'
    }
  },
  sideEffects: ['./cdn/vezham-icons.js', './umd/vezham-icons.js'],
  files: [
    'index.js',
    'index.d.ts',
    'createIcon.js',
    'createIcon.d.ts',
    'icons/',
    'umd/',
    'cdn/'
  ],
  keywords: [
    'icons',
    'vanilla-js',
    'svg-icons',
    'icon-library',
    'outline',
    'filled',
    'tree-shakeable',
    'typescript'
  ]
})

finishBuild(DIST, icons, icons.length * 2 + directSvgFiles + 6)
