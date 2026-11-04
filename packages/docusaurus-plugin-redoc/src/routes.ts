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
 * Render each tag and operation page to HTML at build time, or return nothing
 * if server rendering is off, not applicable, or failed (and may fall back).
 *
 * Only the default locale: other locales are redirected to it for API pages,
 * and rendering every operation once per locale multiplies the build. And only
 * production builds: the stylesheet is written in `postBuild`, which the dev
 * server doesn't run, so `docusaurus start` keeps the client-rendered page.
 *
 * @throws with `ssr: 'required'`, if the pages can't be rendered
 */
async function renderPages({
  context,
  options,
  spec,
  specPath,
}: {
  context: LoadContext;
  options: PluginOptionsWithDefault;
  spec: OpenAPISpec;
  specPath: string;
}): Promise<PrerenderedRoute[]> {
  const { currentLocale, defaultLocale } = context.i18n;
  if (
    !options.ssr ||
    currentLocale !== defaultLocale ||
    process.env.NODE_ENV !== 'production'
  ) {
    return [];
  }

  let pages: PrerenderedRoute[] = [];
  try {
    pages = await prerenderSpec({
      spec,
      basePath: specPath.replace(/\/+$/, '') || '/',
      debug: options.debug,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (options.ssr === 'required') {
      throw new Error(
        `[REDOCUSAURUS_PLUGIN] Server rendering is required (ssr: 'required') but failed for ${specPath}: ${reason}`,
      );
    }
    console.warn(
      `[REDOCUSAURUS_PLUGIN] Server rendering unavailable for ${specPath}, falling back to client-side rendering only:`,
      reason,
    );
  }
  if (options.ssr === 'required' && pages.length === 0) {
    throw new Error(
      `[REDOCUSAURUS_PLUGIN] Server rendering is required (ssr: 'required') but produced no pages for ${specPath}`,
    );
  }
  return pages;
}

/**
 * Register the routes of one spec.
 *
 * With server rendering: one exact route per tag and operation, so unknown
 * sub-paths 404 and the build can validate links against real pages.
 * Without: a single prefix route, because Redoc 3 routes by path below it
 * (e.g. `<route>/<tag>/<operation>`) and the page has to render for those too.
 */
export async function addSpecRoutes({
  actions,
  context,
  options,
  spec,
  specPath,
  modules,
  cssAssets,
}: {
  actions: RouteActions;
  context: LoadContext;
  options: PluginOptionsWithDefault;
  spec: OpenAPISpec;
  specPath: string;
  modules: Partial<Record<keyof ApiDocProps, string>>;
  /** Receives the stylesheet of the server rendered pages */
  cssAssets: SsrCssAsset[];
}): Promise<void> {
  const { addRoute, createData } = actions;
  const { baseUrl } = context.siteConfig;
  const pages = await renderPages({ context, options, spec, specPath });

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
  // every page downloads.)
  const css = mergeStyles(pages.map((page) => page.styles));
  const cssName = `${id}-${shortHash(css)}.css`;
  cssAssets.push({ name: cssName, css });
  const cssHref = normalizeUrl([baseUrl, 'assets/redoc-ssr', cssName]);

  // eslint-disable-next-line no-restricted-syntax
  for (const page of pages) {
    // An operation id with leading or trailing whitespace (a typo in the spec)
    // puts a space before the `#` of Redoc's in-page anchors, which
    // Docusaurus's link checker reads as a link to `#`. Keep the route, since
    // other pages link to it, but leave this page client-rendered.
    if (page.path.split('/').some((segment) => segment !== segment.trim())) {
      console.warn(
        `[REDOCUSAURUS_PLUGIN] ${JSON.stringify(
          page.path,
        )} has whitespace at the edge of a path segment (check the operationId or tag in the spec). Not server rendering this page.`,
      );
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
