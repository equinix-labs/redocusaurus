import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type {
  LoadContext,
  Plugin,
  OptionValidationContext,
} from '@docusaurus/types';
import { normalizeUrl } from '@docusaurus/utils';
import {
  formatProblems,
  getTotals,
  bundle,
  stringifyYaml,
  Document,
  NormalizedProblem,
} from '@redocly/openapi-core';

import {
  PluginOptionSchema,
  PluginOptions,
  PluginOptionsWithDefault,
  PluginDirectUsageOptions,
  DEFAULT_OPTIONS,
} from './options';
import type { SpecProps, ApiDocProps } from './types/common';

// Redoc 3 doesn't export its spec types, so use a loose equivalent.
type OpenAPISpec = Record<string, any>;
import { loadSpecWithConfig } from './loadSpec';
import { loadRedoclyConfig } from './loadRedoclyConfig';
import { prerenderSpec, mergeStyles, type PrerenderedRoute } from './ssr';

/**
 * Redoc 3 builds each operation's URL from its operationId, so surrounding
 * whitespace in one (a typo, e.g. `"getFoo "`) ends up at the edge of a path
 * segment. Such a route can't be linked to or validated reliably, so trim it,
 * in place, and say which operations were changed so the spec can be fixed.
 */
function trimOperationIds(parsed: OpenAPISpec, specName: string): void {
  const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
  Object.entries(parsed?.paths ?? {}).forEach(([apiPath, pathItem]) => {
    methods.forEach((method) => {
      const operation = (pathItem as Record<string, any> | undefined)?.[method];
      const id = operation?.operationId;
      if (typeof id === 'string' && id !== id.trim()) {
        console.warn(
          `[REDOCUSAURUS_PLUGIN] ${specName}: operationId ${JSON.stringify(
            id,
          )} (${method.toUpperCase()} ${apiPath}) has surrounding whitespace; using ${JSON.stringify(
            id.trim(),
          )}. Fix it in the spec.`,
        );
        operation.operationId = id.trim();
      }
    });
  });
}

/** Short stable hash, for data file names. */
function hash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require('../package.json').version;

export { PluginOptions, PluginDirectUsageOptions, loadRedoclyConfig };

export default function redocPlugin(
  context: LoadContext,
  opts: PluginOptions,
): Plugin<{
  converted: OpenAPISpec;
  bundle?: Record<string, unknown>;
}> {
  const { baseUrl } = context.siteConfig;
  const options: PluginOptionsWithDefault = { ...DEFAULT_OPTIONS, ...opts };
  const {
    debug,
    spec,
    url: downloadUrl,
    config,
    themeId,
    normalizeUrl: normalizeDownloadUrl,
  } = options;

  let url = downloadUrl;
  const isSpecFile = fs.existsSync(spec);
  // Stylesheets of the server-rendered pages, written to the build in `postBuild`
  const ssrCssAssets: { name: string; css: string }[] = [];

  const fileName = path.join(
    'redocusaurus',
    `${options.id || 'api-spec'}.yaml`,
  );
  let filesToWatch: string[] = isSpecFile ? [path.resolve(spec)] : [];

  if (debug) {
    console.error('[REDOCUSAURUS_PLUGIN] Opts Input:', opts);
    console.error('[REDOCUSAURUS_PLUGIN] Options:', options);
  }

  return {
    name: 'docusaurus-plugin-redoc',
    async loadContent() {
      const redoclyConfig = await loadRedoclyConfig(config);
      if (redoclyConfig.configPath) {
        filesToWatch.push(redoclyConfig.configPath);
      }

      let bundledSpec: Document, problems: NormalizedProblem[];

      if (!isSpecFile) {
        // If spec is a remote url then add it as download url also as a default
        url = url || spec;
        if (debug) {
          console.log('[REDOCUSAURUS_PLUGIN] bundling spec from url', spec);
        }
        ({ bundle: bundledSpec, problems } = await loadSpecWithConfig(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          spec!,
          redoclyConfig,
        ));
      } else {
        // If local file
        if (debug) {
          console.log('[REDOCUSAURUS_PLUGIN] reading file: ', spec);
        }

        const fileBundle = await bundle({
          ref: spec,
          config: redoclyConfig,
        });

        ({ bundle: bundledSpec, problems } = fileBundle);

        filesToWatch = [path.resolve(spec), ...fileBundle.fileDependencies];
      }

      if (problems?.length) {
        console.error('[REDOCUSAURUS_PLUGIN] errors while bundling spec', spec);

        formatProblems(problems, {
          totals: getTotals(problems),
          version,
        });
      }

      if (debug) {
        console.log('[REDOCUSAURUS_PLUGIN] File Bundled');
      }
      // Redoc 3 converts Swagger 2.0 to OpenAPI itself at render time, and its
      // package is a browser-only ES module that can't be loaded here in Node.
      const converted = bundledSpec.parsed as OpenAPISpec;
      trimOperationIds(converted, spec);

      // If download url is not provided then use bundled yaml as a static file (see `postBuild`)
      url = url || fileName;

      return {
        converted,
        bundle: bundledSpec.parsed as Record<string, unknown>,
      };
    },
    async contentLoaded({ content, actions }) {
      const { createData, addRoute, setGlobalData } = actions;
      if (!content?.converted) {
        throw new Error(`[Redocusaurus] Spec could not be parsed: ${spec}`);
      }

      const data: SpecProps = {
        url,
        themeId,
        isSpecFile,
        normalizeUrl: normalizeDownloadUrl,
        route: options.route,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spec: content.converted as any,
      };
      setGlobalData(data);

      if (options.route) {
        const routePath = options.route.startsWith('/')
          ? options.route.slice(1)
          : options.route;

        const specProps = await createData(
          `redocApiSpecV1.2-${options.id || '1'}.json`,
          JSON.stringify(data),
        );
        const layoutProps = await createData(
          `redocApiLayoutV1-${options.id || '1'}.json`,
          JSON.stringify(options.layout),
        );

        const modules: Partial<Record<keyof ApiDocProps, string>> = {
          specProps,
          layoutProps,
        };
        const specPath = normalizeUrl([baseUrl, routePath]);

        // Render each tag and operation page to HTML at build time. Only the
        // default locale: other locales are redirected to it for API pages, and
        // rendering every operation once per locale multiplies the build.
        const { currentLocale, defaultLocale } = context.i18n;
        let prerendered: PrerenderedRoute[] = [];
        // Production builds only: the stylesheet is written in `postBuild`,
        // which the dev server doesn't run, so `docusaurus start` keeps the
        // client-rendered page (a single prefix route that renders any sub-path).
        if (
          options.ssr &&
          currentLocale === defaultLocale &&
          process.env.NODE_ENV === 'production'
        ) {
          try {
            prerendered = await prerenderSpec({
              spec: content.converted,
              basePath: specPath.replace(/\/+$/, '') || '/',
              debug,
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
          if (options.ssr === 'required' && prerendered.length === 0) {
            throw new Error(
              `[REDOCUSAURUS_PLUGIN] Server rendering is required (ssr: 'required') but produced no pages for ${specPath}`,
            );
          }
        }

        if (prerendered.length > 0) {
          // One exact route per page: unknown sub-paths 404, and the build can
          // validate links against real pages.
          const id = options.id || '1';
          // The same rules repeat on almost every page (about 280 KB each), so
          // merge them into one stylesheet per spec. It is written as a static
          // asset in `postBuild` and linked from the head of these pages only.
          // (Importing it as a CSS module instead would fold it into the
          // site-wide stylesheet that every page downloads.)
          const css = mergeStyles(prerendered.map((page) => page.styles));
          const cssName = `${id}-${hash(css)}.css`;
          ssrCssAssets.push({ name: cssName, css });
          const cssHref = normalizeUrl([baseUrl, 'assets/redoc-ssr', cssName]);
          // eslint-disable-next-line no-restricted-syntax
          for (const page of prerendered) {
            // An operation id with leading or trailing whitespace (a typo in the
            // spec) puts a space before the `#` of Redoc's in-page anchors, which
            // Docusaurus's link checker reads as a link to `#`. Keep the route,
            // since other pages link to it, but leave this page client-rendered.
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
            const pageKey = hash(page.path);
            // eslint-disable-next-line no-await-in-loop
            const ssrProps = await createData(
              `redocSsrV1-${id}-${pageKey}.json`,
              JSON.stringify({ html: page.html, cssHref }),
            );
            addRoute({
              modules: { ...modules, ssrProps },
              component: '@theme/ApiDoc',
              exact: true,
              path: page.path,
            });
          }
          if (debug) {
            console.error(
              `[REDOCUSAURUS_PLUGIN] Routes: ${prerendered.length} pages`,
            );
          }
        } else {
          const routeOptions = {
            modules,
            component: '@theme/ApiDoc',
            // Redoc 3 routes by path below this route (e.g. `<route>/<tag>/<operation>`),
            // so the page has to render for those sub-paths as well.
            exact: false,
            path: specPath,
          };

          if (debug) {
            console.error('[REDOCUSAURUS_PLUGIN] Route:', routeOptions);
          }
          addRoute(routeOptions);
        }
      }
    },
    async postBuild({ content }) {
      ssrCssAssets.forEach(({ name, css }) => {
        const file = path.join(context.outDir, 'assets', 'redoc-ssr', name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, css);
      });
      if (!isSpecFile || downloadUrl) {
        return;
      }
      // Create a static file from bundled spec
      const staticFile = path.join(context.outDir, fileName);
      const dir = path.dirname(staticFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      if (debug) {
        console.error(
          '[REDOCUSAURUS_PLUGIN] creating static bundle copy for download',
          staticFile,
        );
      }
      // create bundled url
      const bundledYaml = stringifyYaml(content.bundle || content.converted);
      fs.writeFileSync(staticFile, bundledYaml);
    },
    getPathsToWatch() {
      return filesToWatch;
    },
  };
}

export function validateOptions({
  options,
  validate,
}: OptionValidationContext<
  typeof PluginOptionSchema,
  PluginOptions
>): PluginOptions {
  const validatedOptions = validate(PluginOptionSchema, options);
  return validatedOptions;
}
