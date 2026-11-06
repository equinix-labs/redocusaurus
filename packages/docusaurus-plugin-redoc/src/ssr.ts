import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { Worker } from 'worker_threads';

/**
 * Build-time server rendering for Redoc 3.
 *
 * Redoc 3 can render without a browser: `prepareApiDocs` builds the page model
 * (async) and `RedoclyApiDocsStandalone` renders it, falling back to a
 * `MemoryRouter` when there is no `window`. Docusaurus renders pages
 * synchronously, so the render happens here, once per route, and the HTML is
 * handed to the theme as data.
 */

export interface PrerenderedRoute {
  /** Full route path, including the site's baseUrl (e.g. `/api-catalog/x/ports/getports`). */
  path: string;
  /** Rendered HTML of the Redoc page for this route (empty when only listing routes). */
  html: string;
  /** styled-components `<style>` tags collected while rendering (empty when only listing routes). */
  styles: string;
}

type RouteItem = {
  link?: string;
  items?: RouteItem[];
};

// The plugin is compiled to CommonJS, where tsc turns a literal `import()` into
// `require()`. Redoc 3 is an ES module and cannot be required, so hide the
// `import()` from the compiler.
/** The part of Redoc 3's API that is used to render on the server. */
interface RedocServerApi {
  prepareApiDocs(args: {
    spec: Record<string, unknown>;
    options: Record<string, unknown>;
    basePath: string;
    convertedDownload: boolean;
  }): Promise<{
    items: RouteItem[];
    store: unknown;
    options: unknown;
    document?: unknown;
    timings?: unknown;
  }>;
  RedoclyApiDocsStandalone: unknown;
  ServerStyleSheet: new () => {
    collectStyles(tree: unknown): unknown;
    getStyleTags(): string;
    seal(): void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<Partial<RedocServerApi>>;

/**
 * Merge the styled-components `<style>` tags of many pages into one stylesheet.
 *
 * styled-components emits only the rules for the components a page uses, so
 * pages differ, but almost every rule repeats on many pages. Rules are separated
 * by `/*!sc*\/` markers; keep each distinct rule once, in order of first
 * appearance. Rules for different components rarely touch the same element, so
 * the relative order between them hardly matters.
 */
export function mergeStyles(styleTags: string[]): string {
  const rules = new Set<string>();
  styleTags.forEach((tags) => {
    [...tags.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].forEach(
      ([, css]) => {
        css.split('/*!sc*/').forEach((rule) => {
          const trimmed = rule.trim();
          if (trimmed) {
            rules.add(trimmed);
          }
        });
      },
    );
  });
  return `${[...rules].join('\n')}\n`;
}

/** Every route in the page model: the overview, each tag, each operation. */
export function collectRoutes(items: RouteItem[] | undefined): string[] {
  const routes = new Set<string>();
  const walk = (list: RouteItem[] | undefined) => {
    list?.forEach((item) => {
      if (typeof item.link === 'string' && item.link.startsWith('/')) {
        routes.add(item.link.replace(/\/+$/, '') || '/');
      }
      walk(item.items);
    });
  };
  walk(items);
  return [...routes];
}

/**
 * Render every route of a spec to HTML.
 *
 * Redoc is resolved through the theme package, because that is where it is a
 * dependency (the plugin has none). `react`, `react-dom` and `react-router` are
 * then resolved from Redoc's own location so that they are the same copies Redoc
 * uses: a second copy of `react-router` would not share Redoc's router context.
 *
 * Runs in the calling thread. Use {@link prerenderSpec} from the plugin, which
 * runs this in a worker (see there for why).
 *
 * @throws if Redoc or its peers can't be resolved or rendering fails.
 */
export async function renderSpecRoutes({
  spec,
  basePath,
  downloadUrl,
  render = true,
  debug,
}: {
  spec: Record<string, unknown>;
  basePath: string;
  /** Address of the downloadable spec, offered on every page */
  downloadUrl?: string;
  /**
   * `false` only lists the routes (empty `html` and `styles`), which is much
   * cheaper than rendering every page.
   */
  render?: boolean;
  debug?: boolean;
}): Promise<PrerenderedRoute[]> {
  const themeRequire = createRequire(
    require.resolve('docusaurus-theme-redoc/package.json'),
  );
  const redocEntry = themeRequire.resolve('redoc');
  const redocRequire = createRequire(redocEntry);

  const React = redocRequire('react');
  const { renderToString } = redocRequire('react-dom/server');
  const { MemoryRouter } = redocRequire('react-router');
  const { prepareApiDocs, RedoclyApiDocsStandalone, ServerStyleSheet } =
    await importEsm(pathToFileURL(redocEntry).href);

  // RedoclyApiDocsStandalone is a memo() component, which is an object, not a function
  if (
    typeof prepareApiDocs !== 'function' ||
    !RedoclyApiDocsStandalone ||
    typeof ServerStyleSheet !== 'function'
  ) {
    throw new Error(
      'redoc does not export prepareApiDocs, RedoclyApiDocsStandalone and ServerStyleSheet',
    );
  }

  const started = Date.now();
  const prepared = await prepareApiDocs({
    spec,
    // A build never reports usage events
    options: {
      disableTelemetry: true,
      ...(downloadUrl ? { downloadUrls: [{ url: downloadUrl }] } : {}),
    },
    basePath,
    // A server pass can't create the `blob:` download URL for a converted spec
    convertedDownload: false,
  });

  const routes = collectRoutes(prepared.items);
  if (debug) {
    console.log(
      `[REDOCUSAURUS_PLUGIN] SSR: prepared ${routes.length} routes in ${
        Date.now() - started
      } ms`,
    );
  }

  if (!render) {
    return routes.map((route) => ({ path: route, html: '', styles: '' }));
  }

  const rendered: PrerenderedRoute[] = [];
  routes.forEach((route) => {
    const sheet = new ServerStyleSheet();
    try {
      const html: string = renderToString(
        sheet.collectStyles(
          React.createElement(
            MemoryRouter,
            { initialEntries: [route] },
            React.createElement(RedoclyApiDocsStandalone, {
              items: prepared.items,
              store: prepared.store,
              options: prepared.options,
              basePath,
              spec: prepared.document,
              buildTimings: prepared.timings,
            }),
          ),
        ),
      );
      rendered.push({ path: route, html, styles: sheet.getStyleTags() });
    } finally {
      sheet.seal();
    }
  });

  if (debug) {
    console.log(
      `[REDOCUSAURUS_PLUGIN] SSR: rendered ${rendered.length} routes in ${
        Date.now() - started
      } ms`,
    );
  }
  return rendered;
}

/**
 * Render every route of a spec to HTML, in a worker thread with
 * `NODE_ENV=production`.
 *
 * A worker has its own module registry. In the Docusaurus process `react` is
 * usually loaded already (under whatever `NODE_ENV` it started with), while
 * `react-dom/server` would load after Docusaurus sets `NODE_ENV=production`.
 * React 19's development and production builds don't work together
 * ("dispatcher.getOwner is not a function"), so rendering in-process fails.
 *
 * @throws if the worker fails. The caller treats that as "server rendering
 * unavailable".
 */
export function prerenderSpec(options: {
  spec: Record<string, unknown>;
  basePath: string;
  downloadUrl?: string;
  render?: boolean;
  debug?: boolean;
}): Promise<PrerenderedRoute[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'ssrWorker.js'), {
      workerData: options,
      env: { ...process.env, NODE_ENV: 'production' },
    });
    let settled = false;
    worker.once(
      'message',
      (message: { pages?: PrerenderedRoute[]; error?: string }) => {
        settled = true;
        if (message.error !== undefined) {
          reject(new Error(message.error));
        } else {
          resolve(message.pages ?? []);
        }
      },
    );
    worker.once('error', (error) => {
      settled = true;
      reject(error);
    });
    worker.once('exit', (code) => {
      if (!settled) {
        reject(new Error(`SSR worker exited with code ${code}`));
      }
    });
  });
}
