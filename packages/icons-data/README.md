# Vezham Icons source catalog

The SVG files in [`icons/`](./icons) are the shared source for the Vezham Icons packages.

## Add or update an icon

1. Put each icon in `icons/<category>/<icon-name>/`. Use lowercase, hyphenated names for folders with more than one word.
2. Save at least one supported weight as `outline.svg`, `filled.svg`, `duotone-outline.svg`, or `duotone-filled.svg`. The other weights are optional.
3. Use `viewBox="0 0 24 24"` and use `currentColor` for fills or strokes that should follow the icon color set by the application.
4. Add an optional `meta.json` beside the SVGs with a `description` array of search terms.

For example, [`icons/ui/home/`](./icons/ui/home) contains the Home icon. Its search metadata can contain terms like these.

```json
{
  "description": ["house", "residence"]
}
```

## Rebuild the packages

After editing the source catalog, run this command from the repository root.

```sh
pnpm nx run-many -t build -p 'tag:scope:icons'
```

This regenerates the npm packages’ `dist/` outputs and the Flutter package’s Dart catalog.
