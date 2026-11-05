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
- [ ] **2. Agree the PR split** with the maintainer (see "Proposed split"), and ask whether
      they want a pre-release (`next`) or a major version. Number 1 was dropped on purpose:
      the context for #473 is in the staging PR description and this file, so the issue is
      left alone for now.

### B. Required for any PR
- [x] **3. Lint, type check and build are green.** `yarn build` (packages and website),
      the type check and `yarn lint` pass (0 errors; the 2 warnings in the website pages
      are upstream's). Cleanup done: formatting on the files this branch changes, the `any`
      types replaced with small local types, and `plugin/src/index.ts` split (the route
      registration is in `routes.ts`, `trimOperationIds` and the hash helper in
      `specUtils.ts`). The website output is byte-identical before and after the split.
- [~] **4. The demo website builds and works with Redoc 3** (details below). Builds with
      0 broken links or anchors (Docusaurus 3.6.0, React 18.3.1, the `faster`/Rspack bundler).
      Done:
      - Docs text updated: README and the preset's README (Redoc 3, Node 22+, link to the
        migration guide), the plugin's README and the Plugin Options page (new `ssr`
        option), the Introduction (features, upgrade link), the V1 guide (pointer to the V3
        guide), and a "Downloading the spec" section in the V3 guide.
      - Compared the three e2e pages with the live Redoc 2 site (screenshots, light mode).
        Found and fixed: **the download link was missing**. Redoc 2 got it from `specUrl`;
        the port dropped the spec's `url`. Now passed as Redoc 3's `downloadUrls` in the
        browser and in the build-time render (`resolveDownloadUrl`, 5 tests).
      Other findings from the comparison:
      - **Embedded pages were cramped (fixed).** In `<ApiDocMdx>` (the nested example)
        Redoc 3 kept its three columns inside Docusaurus's narrow docs column: the middle
        column was about 300px and the title wrapped over 5 lines. The cause was a Redoc 2
        leftover in `ApiDocMdx`: it set `theme.breakpoints`, which Redoc 3 ignores. It now
        sets Redoc 3's `layout: 'stacked'` as a default, which a `layout` set by the site
        overrides. Documented in the V3 guide and in "Showing Multiple APIs". Not covered
        by a unit test (React component; checked with a screenshot).
      - Redoc 3 shows the spec's `x-logo` and a search box in the sidebar, an overview card
        (URL, support, license, servers) on the right, and a "Copy" button (Redoc 2 had
        none of these). Expected, not a regression; mention in the PR description.
      - The remote URL page's download link points at the remote spec itself.
      Left: Percy runs only upstream (a Vercel preview and their token), so the baselines
      can't be approved here. All three pages (`/examples/using-single-yaml/`,
      `/examples/using-remote-url/`, `/docs/nested/nested-1`) will differ. Add before and
      after screenshots (light and dark) to the PR description (item 16). Dark mode was not
      re-captured here (headless Chrome did not switch the site to dark).
- [x] **5. A changeset.** `.changeset/bright-routes-render.md`: a major bump for the three
      linked packages (`docusaurus-plugin-redoc`, `docusaurus-theme-redoc`, `redocusaurus`),
      listing the breaking changes and what is new, and linking the migration guide. Check
      it with `yarn changeset status --since=origin/main` once committed. Before submitting:
      re-check every claim in it against the final code, since it becomes the changelog.
- [x] **6. Migration guide and a list of breaking changes.**
      `website/docs/guides/migrating-to-v3.md`: requirements (Node 22+), links changing from
      hashes to paths (and what the browser redirect does not cover), build-time rendering
      and the `ssr` option, theming (`primaryColor`, `cssVariables`, the ignored `theme`
      object), telemetry off by default, the removed `ApiOperation`, `ApiSchema`,
      `ServerRedoc` and `ServerStyles`, options, and Swagger 2.0. Left to confirm before
      submitting: the line about `options` is generic (Redoc 3's own configuration
      reference); list the specific Redoc 2 options that changed once we know them.

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
- [x] **9. Reliance on Redoc internals.** Redoc 3 has no option for its color mode (checked
      against the 3.0.1 bundle). It keeps the mode in its app store, mirrors it to
      `localStorage['redoc.colorMode']`, reads that key only when it mounts, and applies it
      as a `light` or `dark` class on `<html>`; its own inline no-flash script in the
      server-rendered HTML relies on the same two things, so they are a stable de facto
      contract. So there is nothing supported to switch to. What was done:
      - **Isolated:** everything that touches those internals is in
        `utils/redocColorMode.ts` (the key, the class names, and `reconcileColorMode`, the
        pure rule for what to do with the `<html>` class) with a header listing exactly
        what it relies on. The hook is `utils/useRedocColorModeSync.ts`, and `Redoc.tsx`
        no longer contains any of it.
      - **Easy to turn off:** new theme option `syncColorMode` (default `true`). With
        `false` it writes nothing, watches nothing and does not remount Redoc; Redoc
        follows its own mode (the OS, or its own switch). Documented in Theme Options and
        the theme README, and in the changeset. Checked in a browser: with it on, the
        `<html>` class and `data-theme` agree in dark and light; with it off and the OS in
        dark mode, Docusaurus in light mode leaves Redoc in dark.
      - **Guarded:** `test/redocColorMode.test.js` has a contract test that reads the
        installed Redoc bundle and fails if the key, the `light`/`dark` names or the class
        application change (`redoc` is pinned, so an upgrade is deliberate), plus tests of
        the reconcile rule and of storing the mode. Checked by breaking the code.
      - Known cost, not changed: Redoc reads the mode only when it mounts, so a switch from
        Docusaurus remounts Redoc (a keyed remount). On a very large spec that is slower
        than a live update. Revisit if it matters.
- [~] **10. Compatibility matrix** (see the table below). Every row is tested except
      Safari and Firefox, which need a person with those browsers (Chrome is the only one
      used so far). Manual check, on the website built with `yarn build:website` and served
      with `docusaurus serve`, in each browser, light and dark:
      1. `/examples/using-single-yaml/`: the page renders, the sidebar and search work.
      2. Open `/examples/using-single-yaml/pet/getpetbyid` directly (a reload on it too):
         the operation shows, and Back and Forward move between pages.
      3. Old link `/examples/using-single-yaml/#tag/pet/operation/getPetById` redirects to
         the path above.
      4. Switch the Docusaurus theme (sun or moon in the navbar): Redoc follows. Use the
         switch in Redoc's sidebar: Docusaurus follows. Reload: the mode stays.
      5. The Download card links to `/redocusaurus/using-single-yaml.yaml`.
      6. `/docs/nested/nested-1`: two columns (stacked), no squeezed title.
      7. Console: no errors apart from blocked third-party requests.
      Record the browser versions here when done.
      Result: steps 1 to 7 pass in **Safari 27.2 (21625.2.8.18.4)**, **Firefox 159.0.1
      (aarch64)** and **Chrome 156.0.8078.80 (arm64)**, with one finding. **Reloading a
      link inside an API that is embedded in a page of your own returns a 404.** Checked by
      collecting every link Redoc renders on each example page (after it mounts) and
      requesting it: the five examples with their own `route` (`using-single-yaml`,
      `using-remote-url`, `using-multi-file-yaml`, `using-single-json`,
      `using-swagger-json`) have none; `/docs/nested/nested-1` (`<ApiDocMdx>`),
      `/examples/custom-page/` (`@theme/ApiDoc`) and `/examples/custom-layout/`
      (`@theme/Redoc`) 404 on every link inside them (for example
      `/docs/nested/nested-1/pet/getpetbyid`). Redoc 3 routes by path below the page it is
      on and a page of your own has no routes below it; Redoc 2's hashes survived a
      reload. Documented in the guides. Options, not decided: (a) leave it and document
      (done), (b) give embedded APIs a hash router (`HashRouter`, links like
      `/docs/nested/nested-1#/pet/getpetbyid`: reload, sharing, Back and Forward work; needs
      the legacy mapper to target it, and has not been tried), (c) a memory router (reload
      works, but no shareable operation links and no Back and Forward). The large consuming
      site tested does not embed APIs, so this does not affect it.
- [x] **17. Declare the Node and peer requirements.** `engines.node` is `>=22` in the three
      packages and the root (Redoc 3 needs it), and the Installation page lists the
      requirements. Tested with yarn 4 (`nodeLinker: pnpm`, a strict symlinked layout like
      pnpm's, fresh project with Docusaurus 3.6.0) using `yarn explain peer-requirements`.
      The Redoc 3.0.1 bundle imports only `react`, `react/jsx-runtime`, `react-dom`,
      `react-router` and `styled-components` at run time. Decisions:
      - **`react-router` stays a dependency of the theme (`^7.0.0`), not a peer.** Redoc
        wants `^7 || ^8` as a peer, but Docusaurus core depends on react-router 5.3.4 and
        npm/yarn hoist it, so a peer on 7 would conflict. The dependency guarantees a copy
        Redoc accepts, and the scoped webpack rule points Redoc at it.
      - **`react` and `react-dom` are now peers** (`^18.3.0 || ^19.0.0`, Redoc's range) of
        the theme and of the preset (which depends on the theme, so it has to pass them
        on). Before, the strict check showed the theme not providing them to Redoc,
        react-router and styled-components: with pnpm's default `auto-install-peers` that
        can give Redoc a second copy of React, which breaks hooks.
      - **`@redocly/config`** (a peer of Redoc, used for types only; the Redoc bundle does
        not import it) is now a dependency of the theme, `^0.67.0`, the same as
        openapi-core uses. It removes an unmet-peer warning for every yarn user.
      - **`styled-components`** stays a dependency of the theme (a peer of Redoc).
      - Removed from the theme because nothing imports them (Redoc 2 leftovers): `mobx`,
        `postcss`, `postcss-prefix-selector`, `@types/postcss-prefix-selector`. The plugin's
        dev-only leftovers (`mobx`, `react`, `styled-components`) are not shipped; left.
      - After the change the only unmet peers on the strict check are upstream's:
        `webpack` is not passed from the preset to the theme, and a project does not
        provide `@docusaurus/theme-common` and `@docusaurus/utils` to the preset.
      - **pnpm itself was not tested**: the registry blocks the pnpm download (HTTP 403),
        which is not worked around. The yarn check above is the closest equivalent.
- [x] **18. Requests Redoc 3 makes at run time.** Audited two ways: a scan of the Redoc
      3.0.1 bundle for hosts, and Chrome's net log on the built website (home, overview,
      operation and embedded pages; Chrome's own background traffic ignored). Findings:
      - Always: `cdn.redoc.ly/redoc/logo-mini-full.svg` (`logo-mini.svg` when the sidebar is
        collapsed), the "API docs by Redocly" badge, loaded after mount. **No option to
        turn it off.** It hides itself if the image fails (`onError`), so a CSP block is
        graceful. CSS can hide it but the image is still requested.
      - Telemetry: `otel.cloud.redocly.com`, only with `disableTelemetry: false` (item 8).
        None seen.
      - Icons: `cdn.redocly.com/icons/fa/7.0.0` and `/icons/code/5.24.0`, only when a named
        icon is rendered (a CSS background image, so `img-src`). **0 requests** on the
        example pages: the built-in UI uses inline SVG.
      - The spec's own `x-logo` and images load from wherever they point (the Petstore
        example loads one from `redocly.github.io`).
      - Not a request: the "Copy" menu's "Open in Claude/ChatGPT" opens `claude.ai/new` or
        `chatgpt.com` on click, with the page text or the spec's URL in the request.
        **No option to remove it** (`showPageActions` is set per node by Redoc, not a user
        option). Matters for private specs.
      - No requests for Redoc itself, fonts or styles. Redoc is MIT licensed with no
        attribution requirement beyond the license notice.
      Documented in a new guide, `website/docs/guides/network-requests.md` (CSP directives
      per request), linked from the V3 guide. Possible follow-ups, not needed for the PR:
      ask Redocly for an option to hide the badge and the Copy menu, or self-host the badge.

### D. Tests and decisions
- [x] **11. Unit tests.** 67 tests in `packages/*/test`, using Node's built-in test runner
      against the built `dist` (no new dependency): `yarn build:packages && yarn test:unit`,
      and a "Unit Tests" step in the build workflow, after the packages are built.
      Covered: the theme stylesheet builder (defaults follow Infima, `primaryColor`,
      `primaryColorDark`, `cssVariables`, precedence, unsafe values), `getGlobalData`
      (telemetry off by default and overridable, the ignored Redoc 2 `theme` warning once),
      the legacy hash mapper and redirect, `trimOperationIds`, route collection and style
      merging, `ssr` option validation, and `addSpecRoutes` with the real Redoc 3 rendering a
      small spec in the worker (one exact route per page, the shared stylesheet and its link
      under a sub-path `baseUrl`, `ssr: false`, dev builds, other locales, a failed render
      with `true` and `'required'`, and the whitespace page). Each group was checked by
      breaking the compiled code on purpose, and the tests failed as they should. The
      package tsconfigs now exclude `test` from the build, and `.eslintrc` has an override
      for the tests.
      Not covered: the React components and hooks (`Redoc`, `useSpecOptions`), the theme
      plugin's webpack rule and the `postBuild` file writing; those are exercised by the
      website build and the browser checks only.
- [x] **12. Contested defaults**, decided:
      - **`ssr: true` by default** (a failed render warns and falls back to the browser-only
        page; `'required'` fails the build). Same as Redoc 2, which rendered at build time.
        Cost: more build time and space (the largest spec on a big site went from 2.7 MB
        to 38 MB, builds 10 to 25 s longer).
      - **`operationId` whitespace: trim and warn.** A route with whitespace at the edge
        of a segment fails Docusaurus's link check, so leaving it breaks the build anyway.
        The trim only affects the rendered pages, not the downloadable spec.
      - **Dev server and other locales get exact routes without HTML.** The route list is
        worked out in every mode (a worker, no rendering), so a path that is not a page
        is a "Page Not Found" everywhere and links are checked in locale builds. HTML and
        the stylesheet are written for production builds of the default locale only.
        `ssr: false` is still a single prefix route. If the list can't be worked out the
        build warns and falls back to the prefix route (`'required'` only applies where
        HTML is rendered). No "all locales" option until someone asks.
      - **Swap, not hydration, for this PR.** Redoc's `hydrate` is in the standalone bundle,
        `RedocStandalone` renders nothing on its first client render, and the client's DOM
        had a tag section the server HTML didn't. Hydration is a follow-up experiment.
      - **`react-router` stays a dependency** (`^7.0.0`) and **`redoc` an exact pin**
        (`3.0.1`).
- [x] **13. Clean up the preset's types.** The preset imports `PluginOptions['ssr']` from
      the plugin now. (Pointing the website at the workspace removed the published copies
      the type import used to resolve.)

### E. Packaging the PR (final stage)
- [ ] **14. Rebuild the history** from upstream `main` once the content is final: squash
      the checkpoint commits, set the commit identity, and drop the local-only version
      commits (`2.6.0-redoc3.N`).
- [ ] **15. Lockfile.** Regenerate `yarn.lock` from upstream's and only keep the changes
      the port needs.
- [ ] **19. Verify nothing sensitive is leaked, including hints.** (A scan of the pushed history found one: commit `7c51957` added an internal repo name to this file. Fixed at the tip; it stays in that commit until the history is rebuilt in item 14, so scan the history again then.) Before submitting, scan
      the final diff, every commit message and author, the changeset, docs, examples, test
      fixtures, `yarn.lock` (registry URLs), config files and the PR description for
      corporate data, internal names, hostnames, registries, tooling or infrastructure
      details (names of internal sites, repos, tickets, CI and policies, and numbers that
      identify a specific site). Check history as well as the tip, since the history is
      rebuilt in item 14. Keep wording generic ("a large docs site").
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
| `docusaurus start` (dev server, client-side only) | tested (website): starts in seconds, deep pages render, exact routes now, so an unknown sub-path shows Docusaurus's "Page Not Found" (the dev server still answers 200) |
| Other locales (exact routes, HTML only for the default locale) | tested (website, temporary `i18n` config with `en`, `fr`, `ja`): builds with the default `onBrokenLinks: 'throw'`, `fr` and `ja` have the same 32 pages as `en` as small client-rendered shells (about 14 KB against 73 KB), no server-render stylesheet, a deep link renders in the browser, an unknown path is a real 404 |
| Safari 27.2, Firefox 159.0.1, Chrome 156 (macOS, arm64) | tested by hand (the 7 steps above): pass, apart from the embedded reload 404 below |

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
