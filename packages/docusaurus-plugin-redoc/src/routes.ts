import { normalizeUrl } from '@docusaurus/utils';
import type {
  LoadContext,
  PluginContentLoadedActions,
} from '@docusaurus/types';
import type { PluginOptionsWithDefault } from './options';
import type { ApiDocProps } from './types/common';
import type { OpenAPISpec } from './types/redoc-compat';
import { prerenderSpec, mergeStyles, type PrerenderedRoute } from './ssr';
import { shortHash } from './specUtils';

/** A stylesheet for the server rendered pages, written to the build in `postBuild`. */
export interface SsrCssAsset {
  name: string;
  css: string;
}

type RouteActions = Pick<PluginContentLoadedActions, 'addRoute' | 'createData'>;

/**
 * The pages of a spec: one per tag and operation, with rendered HTML where that
 * applies, or nothing if there is no per-page registration (ssr is off, or the
 * routes could not be worked out, and a prefix route is used instead).
 *
 * HTML is rendered only for the default locale (other locales are redirected to
 * it for API pages, and rendering every operation once per locale multiplies the
 * build) and only for production builds (the stylesheet is written in
 * `postBuild`, which the dev server doesn't run). Everywhere else the routes
 * are still listed, with empty `html`, so a path that is not a page is a 404 in
 * every mode and every locale, and the pages are checked as links.
 *
 * @throws with `ssr: 'required'`, if the pages can't be rendered
 */
async function loadPages({
  context,
  options,
  spec,
  specPath,
  downloadUrl,
}: {
  context: LoadContext;
  options: PluginOptionsWithDefault;
  spec: OpenAPISpec;
  specPath: string;
  downloadUrl?: string;
}): Promise<PrerenderedRoute[]> {
  if (!options.ssr) {
    return [];
  }
  const { currentLocale, defaultLocale } = context.i18n;
  const render =
    currentLocale === defaultLocale && process.env.NODE_ENV === 'production';

  let pages: PrerenderedRoute[] = [];
  try {
    pages = await prerenderSpec({
      spec,
      basePath: specPath.replace(/\/+$/, '') || '/',
      downloadUrl,
      render,
      debug: options.debug,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (render && options.ssr === 'required') {
      throw new Error(
        `[REDOCUSAURUS_PLUGIN] Server rendering is required (ssr: 'required') but failed for ${specPath}: ${reason}`,
      );
    }
    console.warn(
      render
        ? `[REDOCUSAURUS_PLUGIN] Server rendering unavailable for ${specPath}, falling back to client-side rendering only:`
        : `[REDOCUSAURUS_PLUGIN] Could not list the pages of ${specPath}, using a single route that renders any path below it:`,
      reason,
    );
  }
  if (render && options.ssr === 'required' && pages.length === 0) {
    throw new Error(
      `[REDOCUSAURUS_PLUGIN] Server rendering is required (ssr: 'required') but produced no pages for ${specPath}`,
    );
  }
  return pages;
}

/**
 * Register the routes of one spec.
 *
 * One exact route per tag and operation, so unknown sub-paths 404 and the build
 * can validate links against real pages. The page has its HTML rendered in
 * production builds of the default locale, and renders in the browser
 * elsewhere.
 * With `ssr: false` (or if the pages can't be worked out): a single prefix
 * route, because Redoc 3 routes by path below it (e.g.
 * `<route>/<tag>/<operation>`) and the page has to render for those too.
 */
export async function addSpecRoutes({
  actions,
  context,
  options,
  spec,
  specPath,
  modules,
  cssAssets,
  downloadUrl,
}: {
  actions: RouteActions;
  context: LoadContext;
  options: PluginOptionsWithDefault;
  spec: OpenAPISpec;
  specPath: string;
  modules: Partial<Record<keyof ApiDocProps, string>>;
  /** Receives the stylesheet of the server rendered pages */
  cssAssets: SsrCssAsset[];
  /** Address of the downloadable spec, offered by Redoc on every page */
  downloadUrl?: string;
}): Promise<void> {
  const { addRoute, createData } = actions;
  const { baseUrl } = context.siteConfig;
  const pages = await loadPages({
    context,
    options,
    spec,
    specPath,
    downloadUrl,
  });

  if (pages.length === 0) {
    const routeOptions = {
      modules,
      component: '@theme/ApiDoc',
      exact: false,
      path: specPath,
    };
    if (options.debug) {
      console.error('[REDOCUSAURUS_PLUGIN] Route:', routeOptions);
    }
    addRoute(routeOptions);
    return;
  }

  const id = options.id || '1';
  // The same rules repeat on almost every page (about 280 KB each), so merge
  // them into one stylesheet per spec. It is written as a static asset in
  // `postBuild` and linked from the head of these pages only. (Importing it as
  // a CSS module instead would fold it into the site-wide stylesheet that
  // every page downloads.) Nothing to write when no page has HTML.
  const rendered = pages.filter((page) => page.html);
  let cssHref: string | undefined;
  if (rendered.length > 0) {
    const css = mergeStyles(rendered.map((page) => page.styles));
    const cssName = `${id}-${shortHash(css)}.css`;
    cssAssets.push({ name: cssName, css });
    cssHref = normalizeUrl([baseUrl, 'assets/redoc-ssr', cssName]);
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const page of pages) {
    // An operation id with leading or trailing whitespace (a typo in the spec)
    // puts a space before the `#` of Redoc's in-page anchors, which
    // Docusaurus's link checker reads as a link to `#`. Keep the route, since
    // other pages link to it, but leave this page client-rendered.
    const unsafe = page.path
      .split('/')
      .some((segment) => segment !== segment.trim());
    if (unsafe && page.html) {
      console.warn(
        `[REDOCUSAURUS_PLUGIN] ${JSON.stringify(
          page.path,
        )} has whitespace at the edge of a path segment (check the operationId or tag in the spec). Not server rendering this page.`,
      );
    }
    // Client-rendered pages: no HTML was rendered for it (dev server, another
    // locale), or it is the unsafe one above. The route is still exact.
    if (unsafe || !page.html) {
      addRoute({
        modules,
        component: '@theme/ApiDoc',
        exact: true,
        path: page.path,
      });
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const ssrProps = await createData(
      `redocSsrV1-${id}-${shortHash(page.path)}.json`,
      JSON.stringify({ html: page.html, cssHref }),
    );
    addRoute({
      modules: { ...modules, ssrProps },
      component: '@theme/ApiDoc',
      exact: true,
      path: page.path,
    });
  }
  if (options.debug) {
    console.error(`[REDOCUSAURUS_PLUGIN] Routes: ${pages.length} pages`);
  }
}
