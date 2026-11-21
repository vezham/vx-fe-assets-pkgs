# @vezham/icons-vscode

Browse Vezham Icons in the VS Code sidebar and insert code snippets into your active file.

## Install from a VSIX

From the root of a [Vezham assets workspace](https://github.com/vezham/vx-fe-assets-pkgs) checkout, build and install the `Vezham.icons` extension.

```sh
pnpm install
pnpm nx run icons-vscode:package-vsix
code --install-extension packages/icons-vscode/vezham-icons.vsix
```

You can also choose **Install from VSIX…** in the VS Code Extensions view and select the generated file.

## Use

Open **Vezham Icons** in the Activity Bar. Select a snippet format, search for an icon, and click it to insert the snippet at the cursor.

[VS Code guide](https://oss.vezham.com/docs/assets/guides/vscode)

## License

See the repository [LICENSE](https://github.com/vezham/vx-fe-assets-pkgs/blob/main/LICENSE) for usage terms.
