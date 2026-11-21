# vezham_icons

Use the Vezham SVG catalog in Flutter and Dart. Access icons by name and weight, then wrap the path data in an SVG string with `vezhamIconSvg`.

## Install from source

Generate the Dart catalog from the root of a [Vezham assets workspace](https://github.com/vezham/vx-fe-assets-pkgs) checkout.

```sh
pnpm install
pnpm nx build icons-flutter
```

Add the generated package to your Flutter app’s `pubspec.yaml`. This path assumes the app and the workspace checkout are in the same parent directory.

```yaml
dependencies:
  vezham_icons:
    path: ../vx-fe-assets-pkgs/packages/icons-flutter
```

Run `flutter pub add flutter_svg` in the app to render SVGs as widgets.

## Use

```dart
import 'package:flutter_svg/flutter_svg.dart';
import 'package:vezham_icons/icons.dart';

final homeIcon = SvgPicture.string(
  vezhamIconSvg(Vezham.outline.home, size: 24),
);
```

[Flutter guide](https://oss.vezham.com/docs/assets/guides/flutter)

## License

See the repository [LICENSE](https://github.com/vezham/vx-fe-assets-pkgs/blob/main/LICENSE) for usage terms.
