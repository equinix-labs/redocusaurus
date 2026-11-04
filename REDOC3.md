# Redoc 3 support: plan to get the PR ready

Tracking work for [#473 "Upgrade to Redoc 3"](https://github.com/rohit-gohri/redocusaurus/issues/473).
The branch is `redoc-3`. This file is the checklist we go through, item by item, until the
pull request is ready to submit. Delete it before submitting (or turn it into the PR
description and a migration guide).

How to use it: each item has a status (`[ ]` to do, `[~]` in progress, `[x]` done) and
notes. We discuss an item, decide, do it, and tick it.

## Where the branch stands

Works, and verified on a large docs site (32 OpenAPI specs, 705 API pages, 0 broken links
or anchors in a production build):

- [x] Port to Redoc 3 (`redoc` 3.0.1, `@redocly/openapi-core` 2): theme renders
      `RedocStandalone` in the browser, the Redoc 2 internals (`AppStore`, `ServerRedoc`,
      `useSpec`, `ApiOperation`, `ApiSchema`) are removed.
- [x] Path routing: Redoc 3 routes by path, so the page route is passed as `basePath`.
- [x] Legacy mapper: `#tag/<Tag>` and `#tag/<Tag>/operation/<id>` links from Redoc 2 are
      redirected to the new path URLs on the client (`utils/legacyHash.ts`).
- [x] Color mode sync between Docusaurus and Redoc 3 (relies on Redoc internals, see item 9).
- [x] Build-time server rendering (`ssr` option) with one exact route per tag and
      operation, a shared stylesheet per spec, and a worker thread for the render.
      `ssr: 'required'` fails the build if it can't render.
- [x] `operationId` whitespace trimmed with a warning.

## Items

### A. Coordination
- [ ] **1. Write a description on #473.** The issue only says "we want Redoc 3 support".
      Add: what Redoc 3 changes (path routing, no `AppStore`, new peer dependencies, Node
      22+), what the branch does, what breaks, and the proposed split (see below). Ask
      whether the maintainer wants a pre-release (`next`) or a major version.
- [ ] **2. Agree the PR split** with the maintainer (see "Proposed split").

### B. Required for any PR
- [x] **3. Lint, type check and build are green.** `yarn build` (packages and website),
      the type check and `yarn lint` pass (0 errors; the 2 warnings in the website pages
      are upstream's). Cleanup done: formatting on the files this branch changes, the `any`
      types replaced with small local types, and `plugin/src/index.ts` split (the route
      registration is in `routes.ts`, `trimOperationIds` and the hash helper in
      `specUtils.ts`). The website output is byte-identical before and after the split.
- [~] **4. The demo website builds and works with Redoc 3** (details below). It builds
      now (Docusaurus 3.6.0, React 18.3.1, the `faster`/Rspack bundler) and the example
      pages render. Left: update the remaining docs text and README that describe Redoc 2,
      and review the pages the visual e2e checks (`website/snapshots.js`). The snapshot
      baselines will all change and need the maintainer's approval.
- [ ] **5. A changeset** (CONTRIBUTING requires one per PR; this is a major bump).
- [ ] **6. Migration guide and a list of breaking changes**: `ApiOperation` and
      `ApiSchema` are removed, new peer dependencies (react-router 7 or 8, React 18.3+/19,
      Node 22+), URLs change from `#tag/...` hashes to paths, and the legacy mapper does
      not handle `#operation/<id>`, `#section/...` or `#schema/...`. The Redoc 2 `theme` object is ignored (use `primaryColor` and
      `cssVariables`), telemetry is off by default, and Node 22 or newer is required.

### C. Functional gaps
- [x] **7. Theme options.** Redoc 3 has no `theme` option and is themed with CSS variables
      (about 2,900 design tokens, light on `:root`, dark on `:root.dark`), so none of the
      Redoc 2 theme settings reached it. Decisions: the API pages follow the Docusaurus
      theme by default, a new option for everything else, and a warning for the old objects.
      Done:
      - `redocData.ts` sets Redoc's tokens from Docusaurus's (Infima) variables (fonts,
        weights, headings, background, text and link colors, primary color and its shades,
        sidebar), so the pages follow the site in light and dark mode with no extra
        configuration. The tokens change with `data-theme`, so one rule serves both modes.
      - `primaryColor` and `primaryColorDark` set the primary tokens (any CSS color; hover,
        active and tinted shades are derived with `color-mix`). `primaryColorDark` falls
        back to `primaryColor`.
      - New option `cssVariables: { light, dark }` for any other token (names with or
        without `--`; `light` applies in both modes and `dark` overrides it; a value with
        `;`, `{` or `}` is skipped with a warning).
      - The Redoc 2 `theme` object (the theme option, and `theme.openapi.theme` in
        `redocly.yaml`) is ignored, with one warning per build. `theme.openapi.theme` was
        removed from the website's `redocly.yaml`.
      - Delivery: Docusaurus does not render a `<style>` from `<Head>` into the static HTML
        (it would flash unthemed until JavaScript runs), so in a production build the
        stylesheet is a small file (`assets/redoc-theme/redoc-theme-<hash>.css`, written in
        `postBuild`) linked from the head of the API pages only. The dev server uses a
        `<style>` tag.
      - Checked in the website: light and dark mode, the configured `#1890ff` shows in links
        and the active item, the sidebar is 300px, embedded pages link the file, other pages
        do not, and the dev server themes the same. The option builder is tested for
        defaults, `primaryColorDark`, `cssVariables` and unsafe values.
      - Docs: Theme Options page and the theme package's README rewritten.
      - Not done: the Redoc tokens that are not mapped (about 2,900 exist; we map the ones
        that carry fonts, colors and layout). Review a few more pages (schemas, code samples)
        for places where Redoc's own colors clash with the site.
- [x] **8. Telemetry.** Redoc 3 sends usage events (page viewed, page time, performance
      metrics, initialized, errors, definition load failures, and UI interactions) over
      OpenTelemetry to `https://otel.cloud.redocly.com/v1/traces`, and it is on unless
      `options.disableTelemetry` is `true`. Loading one Redoc page made 15 requests to that
      host. Decision: **off by default**. The theme's default options set
      `disableTelemetry: true` (a site turns it on with `disableTelemetry: false` in
      `redocly.yaml` or the `options` theme option, documented in the Theme Options page)
      and the build-time render passes it too. After the change the same page load makes 0
      requests to that host. To confirm with the maintainer when we open the PR, since it
      is a default that differs from Redoc's own.
- [ ] **9. Reliance on Redoc internals.** The color mode sync uses
      `localStorage['redoc.colorMode']` and the class on `<html>`, watched with a
      `MutationObserver`. Look for a supported option, or isolate it, document it as
      fragile, and make it easy to turn off.
- [~] **10. Compatibility matrix** (see the table below; most rows are tested now, the rest
      are listed there).
- [~] **17. Declare the Node and peer requirements.** Done: `engines.node` is `>=22` in
      the three packages and the root (Redoc 3 needs it; they said `>=18` and `>=14`), and
      the Installation page lists the requirements. Left: decide how `react-router` is
      declared (a dependency of the theme now, `^7.0.0`, which works with React 18.3,
      while Redoc itself lists it as a peer, `^7 || ^8`), and whether the theme should
      declare `react` and `react-dom` peers (it declares none today).
- [ ] **18. Requests Redoc 3 makes at run time.** Besides telemetry (item 8) it loads the
      "API docs by Redocly" badge image from `cdn.redoc.ly`, and its bundle references icon
      sets on `cdn.redocly.com`. Find out which load in practice, whether there is an
      option to avoid or hide them, and what that means for sites with a strict Content
      Security Policy. Document it either way.

### D. Tests and decisions
- [ ] **11. Unit tests** for `collectRoutes`, `mergeStyles`, the `operationId` trim,
      the `ssr` option validation and `legacyHashToPath`. The repo has no unit test setup
      yet (`yarn test` is the visual e2e).
- [ ] **12. Contested defaults**, decide and document:
      - `ssr` on by default (`true`), and whether a failed render should fall back or fail.
      - Trimming `operationId`s (warn only, or opt-in?).
      - Server rendering for the default locale only (should be an option).
      - Swap (Redoc replaces the server HTML on mount) or true hydration.
- [x] **13. Clean up the preset's types.** The preset imports `PluginOptions['ssr']` from
      the plugin now. (Pointing the website at the workspace removed the published copies
      the type import used to resolve.)

### E. Packaging the PR (final stage)
- [ ] **14. Rebuild the history** from upstream `main` once the content is final: squash
      the checkpoint commits, set the commit identity, and drop the local-only version
      commits (`2.6.0-redoc3.N`).
- [ ] **15. Lockfile.** Regenerate `yarn.lock` from upstream's and only keep the changes
      the port needs.
- [ ] **16. PR description** with before and after screenshots, the numbers (pages,
      build time, size), the breaking changes and the migration guide.

## Proposed split

1. **The port:** Redoc 3 dependency, client-side render, prefix route, legacy mapper, types.
2. **Color mode sync.**
3. **Server rendering:** exact routes, the `ssr` option, shared stylesheet.
4. **Website, docs and migration guide**, with each of the above.

## Compatibility matrix (item 10)

| Case | Status |
| --- | --- |
| `baseUrl: '/'`, Docusaurus 3.10, webpack | tested (large docs site) |
| Docusaurus 3.6.0 (the declared minimum), React 18.3.1, `faster` / Rspack bundler | tested (the website) |
| Sub-path `baseUrl` (`/redocusaurus/`) | tested (website): stylesheet link, links, deep pages, legacy `#tag/...` redirect |
| `trailingSlash: true` and `false` | tested (website): builds, deep pages, stylesheet link |
| OpenAPI 3.x specs | tested |
| Swagger 2.0 JSON, single JSON and multi-file YAML specs, remote URL spec | tested (website examples) |
| Several specs on one site | tested (32, and the website's 7) |
| `<ApiDocMdx>` embedded in an MDX page, `@theme/Redoc` in a custom page | tested (website), after the base path fix below |
| `docusaurus start` (dev server, client-side only) | tested (website): starts in seconds, deep pages render, any unknown sub-path returns 200 (known limitation) |
| Other locales (server render is skipped) | not tested with the plugin |
| Safari, Firefox | not tested |

## Website (item 4)

`website/` is the project's own docs and demo site, and the source of the visual e2e
snapshots (`website/snapshots.js`: single YAML, remote URL, nested docs, schema imports).

- [x] Make it build against the workspace packages, not the published ones.
      `website/package.json` asked for `redocusaurus` `^2.5.2`, which a prerelease version
      does not satisfy, so yarn installed the published Redoc 2 package. It is now
      `workspace:*` (choose the final range together with the changeset).
- [x] Fix what broke (see "Found while building the website").
- [~] Update the docs text that describes Redoc 2. Done: the two guides for removed
      components, the "Build Time Rendering" guide (now describes the `ssr` option), the
      homepage card and the Installation page link. Left: the README, the other guides
      (for example `migrating-to-v1.md`, which still talks about `@theme/ServerStyle`), the
      options page, and the theme options that are not mapped yet (item 7).
- [ ] Open the example pages and compare them with Redoc 2, then review the pages the
      e2e checks (`/examples/using-single-yaml/`, `/examples/using-remote-url/`,
      `/docs/nested/nested-1`).

### Found while building the website

Building the website was the first test of several setups, and it found three bugs and one
breaking change:

1. **Redoc got the wrong `react-router`** (fixed). Redoc 3 needs react-router 7 or 8 as a
   peer, which npm installs but yarn and pnpm do not, and Docusaurus makes
   `@docusaurus/core`'s own `node_modules` win for every import in the bundle, so Redoc's
   `import 'react-router'` resolved to core's version 5 (`BrowserRouter`, `Link` and
   `useNavigate` are not exported). The theme now declares `react-router` `^7.0.0` (works
   with React 18) and its webpack config resolves it from Redoc's own location for Redoc's
   files only.
2. **Embedded Redoc was based at the wrong page** (fixed). With `<ApiDocMdx id="..." />` in
   an MDX page or `@theme/Redoc` in a custom page, the spec's data carries the spec's own
   route and the theme used it as Redoc's base path, so Redoc showed its own "No page at
   this address". The spec's route is now used only on pages under it. The e2e "Nested
   Example" page was affected.
3. **A crash in static generation** from my fix for 2 (`useBaseUrl` returns `undefined`
   without a route). Fixed before commit.
4. **Breaking change:** `ApiOperation` and `ApiSchema` do not exist in the port, so the
   "Operation Imports" and "Schema Imports" guides were removed, and "Schema Imports" was
   taken out of the e2e snapshot list. Decision to confirm with the maintainer: accept the
   removal (documented in the migration guide, item 6), or port the components later.

Also seen: a build warning that Redoc's own bundle uses `import.meta.dirname` (the
bundler mocks it). It comes from `redoc`, not from this repo; watch for it upstream.

## Out of scope for this PR

- A "Try it" console (Redoc 3 community does not ship one; see the analysis in the wiki).
- Real hydration instead of the swap (a possible follow-up).
- Registering exact routes in every mode, including the dev server (a possible follow-up).
