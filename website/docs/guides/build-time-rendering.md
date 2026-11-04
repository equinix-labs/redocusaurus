---
title: Build Time Rendering
description: Parse the OpenAPI schema at build time and skip the loading screen
sidebar_position: 3
---

:::warning
**NOTE:** This is now enabled by default for everyone. Please [add your feedback here](https://github.com/rohit-gohri/redocusaurus/discussions/88).
:::

## Prerequisites

Nothing to be done as a user. When you build the site, the plugin renders every tag and operation of each API to a static HTML page, with the styles it needs, and registers one route for each. Redoc 3 then takes over in the browser.

This only happens in production builds (`docusaurus build`), and only for the default locale. In `docusaurus start` the pages are rendered in the browser.

## Options

The `ssr` option of the preset (or of a single spec) controls it:

| Value | What happens |
| --- | --- |
| `true` (default) | Render at build time. If that fails, print a warning and fall back to rendering in the browser only. |
| `'required'` | Render at build time, and **fail the build** if that is not possible. Use it when your web server has no fallback for unknown paths, so that every page has to exist as a file. |
| `false` | Never render on the server. One route serves every path below the API's route. |

```ts title="docusaurus.config.ts"
presets: [
  [
    'redocusaurus',
    {
      ssr: 'required',
      specs: [{ spec: 'openapi/example.yaml', route: '/api/example/' }],
    },
  ],
],
```

Because each tag and operation is its own page, an unknown path below an API's route is a real 404, and Docusaurus checks links to these pages when it builds.

## Try it out

Disable javascript in your browser and open one of the example pages ⚡️
