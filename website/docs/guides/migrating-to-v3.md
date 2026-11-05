---
title: Migrating to V3
sidebar_position: 5
---

V3 upgrades Redocusaurus from Redoc 2 to **Redoc 3**. Redoc 3 removes the internals that Redocusaurus was built on, so this is a major release, and a few things change for you. Most sites only need to update links and check their theme settings.

## Requirements

- **Node.js 22 or newer.** Redoc 3 needs it.
- Docusaurus 3.6 or newer, and React 18.3 or newer (React 19 works too).
- Redocusaurus installs `react-router` 7 for Redoc. Docusaurus keeps using its own version, and the two do not interfere. You do not need to add it yourself.

## Links to your API pages change

Redoc 2 linked to sections with a hash, like `#tag/Pets/operation/addPet`. Redoc 3 routes by **path**, so each tag and operation has its own URL: the route of your API, then the tag and the operation ID, both in lowercase.

| Redoc 2 | Redoc 3 |
| --- | --- |
| `/api/pets#tag/Pets` | `/api/pets/pets` |
| `/api/pets#tag/Pets/operation/addPet` | `/api/pets/pets/addpet` |

What to do:

1. **Update links in your own docs** to the new form. Docusaurus now checks them when you build, so a link to a tag or operation that does not exist is reported.
2. Old `#tag/<Tag>` and `#tag/<Tag>/operation/<id>` links keep working for visitors: they are redirected in the browser (not on the server) when the page loads.
3. These old links are **not** redirected, and need updating: `#operation/<id>` (it has no tag to build a path from), `#section/...` and `#schema/...`.

## Pages are rendered at build time, one per tag and operation

Redoc 3 can render without a browser, so Redocusaurus renders **every tag and operation to its own static page** when you build, and registers one route for each (see [Build Time Rendering](./build-time-rendering.md)).

- Unknown paths below your API's route are a real 404, and your host does not need a fallback rule for them.
- The HTML is rendered in production builds, for the default locale. `docusaurus start` and the other locales have the same pages (so a path that is not a page is "Page Not Found"), rendered in the browser.
- The new `ssr` option controls it: `true` (default), `'required'` (fail the build if the pages cannot be rendered) or `false`.
- If an `operationId` in your spec has leading or trailing spaces, they are trimmed, with a warning that names the operation. Fix it in the spec.

## Theming

Redoc 3 has no `theme` object. It is themed with CSS variables, and by default **the API pages now follow your Docusaurus theme**: its fonts, colors, and light and dark mode.

- `primaryColor` and `primaryColorDark` still work, and accept any CSS color.
- The Redoc 2 `theme` object, and `theme.openapi.theme` in `redocly.yaml`, are **ignored**. A warning is printed once when you build. Move what you need to `primaryColor` or the new `cssVariables` option.
- Use `cssVariables` for anything else, for example:

```ts
theme: {
  cssVariables: {
    light: { 'sidebar-width': '320px' },
    dark: { 'bg-color': '#000' },
  },
},
```

See [Theme Options](../getting-started/theme-options.md).

## Embedded APIs use a stacked layout

Redoc 2 switched to two columns when `<ApiDocMdx>` was in a narrow docs page, through `theme.breakpoints` (ignored now). Redoc 3 has a `layout` option instead, and `<ApiDocMdx>` sets `layout: 'stacked'` unless you set `layout` yourself.

## Downloading the spec

Redoc 3 offers the download of the spec through its `downloadUrls` option instead of Redoc 2's `specUrl`. Redocusaurus sets it for you, to the copy of the spec it writes to your build (or to the spec's own `url`), and a download card appears in the API's overview. To use other links, set `downloadUrls` in your [Redoc options](../getting-started/theme-options.md#options-optional-object), and to remove the card, set `hideDownloadButtons: true`.

## Telemetry is off by default

Redoc 3 can send usage events (page views, interactions, errors) to Redocly's servers. Redocusaurus turns this **off** by default. To turn it back on, set `disableTelemetry: false` (see [Theme Options](../getting-started/theme-options.md#telemetry)). For everything else Redoc requests, see [Network Requests and CSP](./network-requests.md).

## Components removed

- `@theme/ApiOperation` and `@theme/ApiSchema` no longer exist, so the MDX imports that used them stop building. Link to the operation's page instead, or embed the whole API with [`ApiDocMdx`](./multiple-apis.md).
- `ServerRedoc` and `ServerStyles`, which Redocusaurus used to render Redoc 2 on the server, are gone. If you copied (swizzled) `Redoc` or `ApiDoc` into your site, compare them with the new versions, because `Redoc` now shows the pre-rendered page until Redoc loads in the browser.

`@theme/Redoc`, `@theme/ApiDoc`, `@theme/ApiDocMdx` and `@theme/useSpecData` are still there, and embedding an API in an MDX page or a custom page works as before.

## Options

Redoc 3 has [its own configuration reference](https://redocly.com/docs/redoc/config/). Check the `options` theme option and the `theme.openapi` section of your `redocly.yaml` against it.

## Specs

Swagger 2.0 specs still work: Redoc 3 converts them when the page renders.
