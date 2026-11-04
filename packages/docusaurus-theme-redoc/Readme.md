# Docusaurus Theme Redoc

![npm](https://img.shields.io/npm/v/docusaurus-theme-redoc?style=flat-square)

This theme provides a `Redoc` and a `ApiDoc` theme component with a theme matching the default docusaurus classic theme and with dark mode support.

⚠️⚠️⚠️ NOTE: Not recommended for direct use. Use through main package instead: [`redocusaurus`](https://github.com/rohit-gohri/redocusaurus)

## Usage

1. Install theme:

   ```sh
   npm i --save docusaurus-theme-redoc
   ```

1. Add it as a theme to your docusaurus config:

   ```js
   // docusaurus.config.js

   module.exports = {
     // ...
     themes: ['docusaurus-theme-redoc'],
     // ...
   };
   ```

## Theme Components

### Redoc

`RedocStandalone` with dark mode support, matching docusaurus classic theme.

```js
import Redoc from '@theme/Redoc';
```

See [here for full example.](../../website/src/pages/examples/custom-layout/index.js)

### ApiDoc

Includes a `@theme/Layout` wrapper over Redoc.

```js
import ApiDoc from '@theme/ApiDoc';
```

See [here for full example.](../../website/src/pages/examples/custom-page/index.js)

## Options

Redoc 3 is themed with CSS variables, so by default the API pages follow your Docusaurus theme (fonts, colors, light and dark mode). You only need these options to change that.

```js
{
   /**
   * Highlight color for docs (any CSS color).
   * Defaults to the primary color of your Docusaurus theme.
   */
   primaryColor: '#1890ff',
   /**
    * Highlight color for docs in dark mode, if different.
    * Will default to `primaryColor` if not set.
    */
   primaryColorDark: '#69c0ff',
   /**
   * Any other CSS variables of Redoc 3. `light` applies in both modes,
   * and `dark` overrides it in dark mode.
   */
   cssVariables: {
     light: { 'sidebar-width': '320px' },
     dark: { 'bg-color': '#000' },
   },
   /**
   * Options to pass to redoc (usually set in `redocly.yaml` instead)
   * @see https://redocly.com/docs/redoc/config/
   */
   options: { disableSearch: true },
}
```

### primaryColor (string, any CSS color)

Convenient way to provide the highlighted color used by Redoc (links, the active item, buttons). The hover and active shades are derived from it.

### primaryColorDark (string, any CSS color)

Optional way to change the highlighted color used by Redoc in dark mode. Defaults to `primaryColor` if not set.

### cssVariables (optional, object)

Set any of the CSS variables that Redoc 3 uses for its theme. `light` applies in both modes, and `dark` overrides it in dark mode. Names can be written with or without the leading `--`.

### options (optional, object)

Override redoc options passed to [RedocStandalone](https://redoc.ly/docs/redoc/quickstart/react/) component. See the defaults [here](./src/redocData.ts).

Available properties [here](https://redocly.com/docs/redoc/config/). Telemetry is off by default (`disableTelemetry: true`).

### theme (optional, object)

Deprecated and ignored: this was the Redoc 2 theme object, and Redoc 3 has no such option. A warning is printed once at build time if it is set. Use `primaryColor` and `cssVariables`.

## Docs

See: <https://redocusaurus.vercel.app/docs>
