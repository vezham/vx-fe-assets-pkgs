# @vezham/icons

Use Vezham Icons in browser JavaScript, plain HTML, and server-rendered SVG.

## Install

```sh
npm install @vezham/icons
```

## Use in JavaScript

Import an icon by its PascalCase name in your browser bundle.

```js
import Home from '@vezham/icons/Home'

const icon = Home({ size: 24, weight: 'filled' })
if (icon) document.body.append(icon)
```

Use `Home.toSvg({ size: 24 })` when you need an SVG string, such as during server rendering.

## Use in HTML

```html
<script
  defer
  src="https://cdn.jsdelivr.net/npm/@vezham/icons@latest/dist/cdn/vezham-icons.js"></script>
<vx-icon icon="home" size="24" decorative></vx-icon>
```

To use the Home icon as a standalone image, point an `<img>` tag at its SVG file.

```html
<img
  src="https://cdn.jsdelivr.net/npm/@vezham/icons@latest/dist/cdn/icons/home.svg"
  width="24"
  height="24"
  alt="" />
```

[JavaScript and HTML guide](https://oss.vezham.com/docs/assets/guides/vanilla)
