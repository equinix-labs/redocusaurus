# Docusaurus Plugin Redoc

![npm](https://img.shields.io/npm/v/docusaurus-plugin-redoc?style=flat-square)

This plugin parses your OpenAPI spec files, makes them available as plugin data, and renders each API page to static HTML at build time (with Redoc 3). Can be used to create pages using the `@theme/ApiDoc` component from your theme, or render it through custom react pages.

⚠️⚠️⚠️ NOTE: Not recommended for direct use. Use through main package instead: [`redocusaurus`](https://github.com/rohit-gohri/redocusaurus)

## Options

### spec (required, string: file path or remote absolute url)

Either a file path to an OpenAPI YAML/JSON file, or a url to one hosted on some website (not the same docusaurus website). Will be **parsed** at build time and forwarded to Redoc component.

### url (optional, string: download url)

A url pointing to an OpenAPI spec. This will be used as download url and `spec` will be used for rendering. This is needed because by default the download url will point to a processed and parsed JSON file.

### route (optional, string: relative uri)

Route URL at which docs would be available, this will use the theme component `@theme/ApiDoc` from `docusaurus-theme-redoc` to render the page. You can also skip this option and render the docs as you wish using a custom page.

### ssr (optional, boolean | `'required'`: default `true`)

Render every tag and operation to static HTML at build time, with one exact route each. The HTML is rendered in production builds of the default locale, and the dev server and other locales get the same routes, rendered in the browser. `true` falls back to client-side rendering with a warning if the server render fails, `'required'` fails the build instead, `false` never renders on the server. See [Build Time Rendering](https://redocusaurus.vercel.app/docs/guides/build-time-rendering).

### layout (optional, object: layoutProps)

An object to pass as layout props. Useful to set title/description of the page. See all properties available [here](./src/options.ts#L3).

## Docs

See <https://redocusaurus.vercel.app/docs> for examples and programmatic usage.
