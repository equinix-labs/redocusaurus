---
title: Theme Options
sidebar_position: 2
author: Rohit Gohri
author_url: https://rohit.page
---

These can be passed to the `theme` options object.

Redoc 3 is themed with CSS variables, so **by default the API pages follow your Docusaurus theme**: its fonts, colors, and light and dark mode. You only need the options below to change that.

### primaryColor (string, any CSS color)

Convenient way to provide the highlighted color used by Redoc (links, the active item, buttons).  
Defaults to the primary color of your Docusaurus theme (`--ifm-color-primary`). The hover and active shades are derived from it.

### primaryColorDark (string, any CSS color)

Optional way to change the highlighted color used by Redoc in dark mode. Defaults to `primaryColor` if that is set, and otherwise to the primary color of your Docusaurus theme.

### cssVariables (optional, object)

Set any of the [CSS variables](https://redocly.com/docs/redoc/) that Redoc 3 uses for its theme, for anything the options above do not cover. `light` applies in both modes, and `dark` overrides it in dark mode. Names can be written with or without the leading `--`.

```ts
theme: {
  cssVariables: {
    light: { 'sidebar-width': '320px', 'font-size-base': '15px' },
    dark: { 'bg-color': '#000' },
  },
},
```

A value that contains `;`, `{` or `}` is skipped with a warning.

On screens up to 600px wide the page title and the section headings use smaller sizes (`--h1-font-size` 26px, `--h2-font-size` 22px, and their line heights), because Redoc's own sizes leave no room on a phone and a word like "Automatic" is broken in the middle. Set any of those tokens in `cssVariables.light` to use your own size at every width.

### syncColorMode (optional, boolean, default `true`)

Redoc 3 keeps its own light and dark mode and ignores Docusaurus's. By default Redocusaurus keeps the two in step in both directions: when the reader switches Docusaurus's mode, Redoc follows, and when they use the switch in Redoc's sidebar, Docusaurus follows.

Redoc 3 has no option for this, so it relies on how Redoc stores and applies its mode: the `redoc.colorMode` key in `localStorage`, and a `light` or `dark` class on `<html>`. These are not documented, and a test checks that the Redoc version in use still behaves that way. If a Redoc update ever breaks the sync (for example the API pages stay in the wrong mode), set it to `false`:

```ts
theme: {
  syncColorMode: false,
},
```

Redoc then follows its own mode (the reader's OS preference, or its own switch) and the rest of the page follows Docusaurus's. The colors you set with `primaryColor` and `cssVariables` still follow Docusaurus's mode.

### theme (optional, object)

:::warning
Deprecated and ignored. This was the Redoc 2 theme object, and Redoc 3 has no such option. If it is set (here, or as `theme.openapi.theme` in `redocly.yaml`), a warning is printed once when you build the site. Use `primaryColor` and `cssVariables` instead.
:::

### options (optional, object)

:::warning
Deprecated: Use `redocly.yaml` to specify `theme.options`. See [example](https://github.com/rohit-gohri/redocusaurus/blob/main/website/redocly.yaml).
:::

Override redoc options passed to [RedocStandalone](https://redoc.ly/docs/redoc/quickstart/react/) component. See the defaults [here](https://github.com/rohit-gohri/redocusaurus/blob/main/packages/docusaurus-theme-redoc/src/redocData.ts).

Available properties [here](https://redocly.com/docs/redoc/config/).

You cannot set a theme with this property, use the `primaryColor` and `cssVariables` options above instead.

Auto loaded from `redocly.yaml` if present.

### Telemetry

Redoc 3 can report usage events (page views, page time, interactions and errors) to Redocly's servers. **Redocusaurus turns this off by default**, so your site does not send its visitors' activity to a third party.

To turn it back on, set `disableTelemetry: false` in `redocly.yaml`:

```yaml title="redocly.yaml"
theme:
  openapi:
    disableTelemetry: false
```

or pass it in the `options` theme option (deprecated, see above):

```ts
theme: {
  options: { disableTelemetry: false },
},
```

The build-time rendering of the pages never reports anything, whatever this is set to.
