---
'docusaurus-plugin-redoc': major
'docusaurus-theme-redoc': major
'redocusaurus': major
---

feat!: upgrade to Redoc 3

Redoc 3 replaces the Redoc 2 internals that redocusaurus was built on, so this is a major release. See the [migration guide](https://redocusaurus.vercel.app/docs/guides/migrating-to-v3).

**Breaking changes**

- Requires Node.js 22 or newer (Redoc 3 needs it), and `react` and `react-dom` 18.3 or newer are now peer dependencies of the preset and the theme (they are already in every Docusaurus site). `react-router` 7 is installed next to the version Docusaurus uses, for Redoc.
- Redoc 3 routes by path, not by hash: `#tag/Pets/operation/addPet` is now `<route>/pets/addpet`. Old `#tag/...` links are redirected in the browser, but `#operation/<id>`, `#section/...` and `#schema/...` are not, and links in your own docs should be updated.
- `@theme/ApiOperation` and `@theme/ApiSchema` are removed, and so are the `ServerRedoc` and `ServerStyles` theme components.
- The Redoc 2 `theme` object (the `theme` option, and `theme.openapi.theme` in `redocly.yaml`) is ignored, because Redoc 3 is themed with CSS variables. A warning is printed once at build time.
- Redoc's usage telemetry is turned off by default (`disableTelemetry: true`). Set `disableTelemetry: false` to turn it back on.
- Redoc 3 has its own configuration reference, so review your `options` and the `theme.openapi` section of `redocly.yaml` against it.

**New**

- Every tag and operation is rendered to its own static page at build time, with one exact route each. Unknown paths below an API's route are a 404, links to them are checked when you build, and no server fallback rule is needed. The new `ssr` option (preset or spec) is `true` by default, `'required'` fails the build if it cannot render, and `false` turns it off. Production builds only, default locale only.
- The API pages follow your Docusaurus theme (fonts, colors, light and dark mode) by default. `primaryColor` and `primaryColorDark` accept any CSS color, and the new `cssVariables: { light, dark }` option sets any other Redoc variable.
- Swagger 2.0 specs are converted by Redoc 3 when the page renders.
- Whitespace around an `operationId` is trimmed, with a warning naming the operation.
