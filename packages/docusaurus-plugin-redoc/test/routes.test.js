const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { addSpecRoutes } = require('../dist/routes');
const { DEFAULT_OPTIONS } = require('../dist/options');

/**
 * These tests render a tiny spec with the real Redoc 3, in the worker the plugin
 * uses, so they take a few seconds. They need the packages to be built.
 */

const SPEC = {
  openapi: '3.0.3',
  info: { title: 'Pets', version: '1.0.0' },
  tags: [{ name: 'Pets' }],
  paths: {
    '/pets': {
      get: {
        tags: ['Pets'],
        operationId: 'listPets',
        summary: 'List all pets',
        responses: { 200: { description: 'ok' } },
      },
      post: {
        tags: ['Pets'],
        operationId: 'addPet',
        summary: 'Add a pet',
        responses: { 200: { description: 'ok' } },
      },
    },
  },
};

/** A spec Redoc can not render. */
const BROKEN_SPEC = {};

const SPEC_PATH = '/api/pets';
const PAGES = [
  '/api/pets',
  '/api/pets/pets',
  '/api/pets/pets/listpets',
  '/api/pets/pets/addpet',
];

/** Register the routes of a spec with fake Docusaurus actions, and report. */
async function register({
  spec = SPEC,
  options = {},
  baseUrl = '/',
  locale = 'en',
  defaultLocale = 'en',
  downloadUrl,
} = {}) {
  const routes = [];
  const data = {};
  const cssAssets = [];
  await addSpecRoutes({
    actions: {
      addRoute: (route) => routes.push(route),
      createData: async (name, content) => {
        data[name] = content;
        return `/generated/${name}`;
      },
    },
    context: {
      siteConfig: { baseUrl },
      i18n: { currentLocale: locale, defaultLocale },
    },
    options: {
      ...DEFAULT_OPTIONS,
      id: 'pets',
      spec: 'pets.yaml',
      ...options,
    },
    spec,
    specPath: SPEC_PATH,
    modules: { specProps: '/generated/specProps.json' },
    cssAssets,
    downloadUrl,
  });
  return { routes, data, cssAssets };
}

/** Run `fn` and return what it passed to `console.warn`. */
async function captureWarnings(fn) {
  const original = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

/** The single prefix route used when pages are not rendered. */
function assertPrefixRoute(routes) {
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, SPEC_PATH);
  assert.equal(routes[0].exact, false);
  assert.equal(routes[0].component, '@theme/ApiDoc');
  assert.equal(routes[0].modules.ssrProps, undefined);
}

describe('addSpecRoutes', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('with server rendering', () => {
    test('registers one exact route per page, with its rendered HTML', async () => {
      const { routes, data } = await register();

      assert.deepEqual(
        routes.map((route) => route.path).sort(),
        [...PAGES].sort(),
      );
      routes.forEach((route) => {
        assert.equal(route.exact, true);
        assert.equal(route.component, '@theme/ApiDoc');
        assert.equal(route.modules.specProps, '/generated/specProps.json');
        assert.ok(route.modules.ssrProps, `${route.path} has no ssrProps`);
      });

      const page = routes.find(
        (route) => route.path === '/api/pets/pets/listpets',
      );
      const { html, cssHref } = JSON.parse(
        data[page.modules.ssrProps.replace('/generated/', '')],
      );
      assert.match(html, /List all pets/);
      assert.match(cssHref, /^\/assets\/redoc-ssr\/pets-[0-9a-f]{12}\.css$/);
    });

    test('merges the styles into one stylesheet, named by its content', async () => {
      const { cssAssets, data, routes } = await register();
      assert.equal(cssAssets.length, 1);
      assert.match(cssAssets[0].name, /^pets-[0-9a-f]{12}\.css$/);
      assert.ok(cssAssets[0].css.length > 100, 'the stylesheet is empty');

      // every page links the same file
      const hrefs = new Set(
        routes.map(
          (route) =>
            JSON.parse(data[route.modules.ssrProps.replace('/generated/', '')])
              .cssHref,
        ),
      );
      assert.deepEqual([...hrefs], [`/assets/redoc-ssr/${cssAssets[0].name}`]);
    });

    test('offers the download of the spec in the overview', async () => {
      const { data, routes } = await register({
        downloadUrl: '/redocusaurus/pets.yaml',
      });
      const htmlOf = (path) => {
        const route = routes.find((r) => r.path === path);
        return JSON.parse(
          data[route.modules.ssrProps.replace('/generated/', '')],
        ).html;
      };
      // like in Redoc 2, the download is part of the API's overview page
      assert.match(htmlOf('/api/pets'), /href="?\/redocusaurus\/pets\.yaml"?/);
    });

    test('has no download link without a download url', async () => {
      const { data, routes } = await register();
      routes.forEach((route) => {
        const { html } = JSON.parse(
          data[route.modules.ssrProps.replace('/generated/', '')],
        );
        assert.doesNotMatch(html, /pets\.yaml/);
      });
    });

    test('puts the stylesheet below the base URL of the site', async () => {
      const { data, routes } = await register({ baseUrl: '/docs/' });
      const { cssHref } = JSON.parse(
        data[routes[0].modules.ssrProps.replace('/generated/', '')],
      );
      assert.match(
        cssHref,
        /^\/docs\/assets\/redoc-ssr\/pets-[0-9a-f]{12}\.css$/,
      );
    });

    test('works with ssr: "required" when the pages render', async () => {
      const { routes } = await register({ options: { ssr: 'required' } });
      assert.equal(routes.length, PAGES.length);
    });

    test('leaves a page client-rendered if its path has whitespace at the edge of a segment', async () => {
      // the trailing space of an operationId ends up at the end of its path
      const spec = JSON.parse(JSON.stringify(SPEC));
      spec.paths['/pets'].get.operationId = 'listPets ';

      let result;
      const warnings = await captureWarnings(async () => {
        result = await register({ spec });
      });
      const unsafe = result.routes.filter((route) =>
        route.path.split('/').some((segment) => segment !== segment.trim()),
      );
      assert.deepEqual(
        unsafe.map((route) => route.path),
        ['/api/pets/pets/listpets '],
      );
      unsafe.forEach((route) => {
        // the route exists (other pages link to it) but has no rendered HTML
        assert.equal(route.exact, true);
        assert.equal(route.modules.ssrProps, undefined);
      });
      assert.equal(warnings.length, unsafe.length);
      assert.match(warnings[0], /whitespace/);
      // the other pages are still rendered
      assert.ok(result.routes.some((route) => route.modules.ssrProps));
    });
  });

  describe('without server rendering', () => {
    test('ssr: false registers a single prefix route', async () => {
      const { routes, cssAssets } = await register({ options: { ssr: false } });
      assertPrefixRoute(routes);
      assert.deepEqual(cssAssets, []);
    });
  });

  describe('where the pages are not rendered to HTML', () => {
    /** Exact routes for every page, none with HTML, and no stylesheet. */
    function assertExactRoutesWithoutHtml({ routes, cssAssets }) {
      assert.deepEqual(
        routes.map((route) => route.path).sort(),
        [...PAGES].sort(),
      );
      routes.forEach((route) => {
        assert.equal(route.exact, true);
        assert.equal(route.component, '@theme/ApiDoc');
        assert.equal(route.modules.specProps, '/generated/specProps.json');
        assert.equal(route.modules.ssrProps, undefined);
      });
      assert.deepEqual(cssAssets, []);
    }

    test('a build that is not a production build (the dev server)', async () => {
      process.env.NODE_ENV = 'development';
      assertExactRoutesWithoutHtml(await register());
    });

    test('a locale that is not the default one', async () => {
      assertExactRoutesWithoutHtml(await register({ locale: 'fr' }));
    });

    test('ssr: false is still a single prefix route there', async () => {
      process.env.NODE_ENV = 'development';
      const { routes } = await register({ options: { ssr: false } });
      assertPrefixRoute(routes);
    });

    test('ssr: "required" does not fail the build there, it falls back', async () => {
      process.env.NODE_ENV = 'development';
      let result;
      const warnings = await captureWarnings(async () => {
        result = await register({
          spec: BROKEN_SPEC,
          options: { ssr: 'required' },
        });
      });
      assertPrefixRoute(result.routes);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /Could not list the pages/);

      const other = await register({
        spec: BROKEN_SPEC,
        locale: 'fr',
        options: { ssr: 'required' },
      }).catch((error) => error);
      assert.ok(!(other instanceof Error), 'a locale build must not fail');
      assertPrefixRoute(other.routes);
    });
  });

  describe('when the render fails', () => {
    test('ssr: true warns and falls back to the prefix route', async () => {
      let result;
      const warnings = await captureWarnings(async () => {
        result = await register({ spec: BROKEN_SPEC });
      });
      assertPrefixRoute(result.routes);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /Server rendering unavailable/);
      assert.match(warnings[0], /\/api\/pets/);
    });

    test('ssr: "required" fails the build, naming the spec path and the reason', async () => {
      await assert.rejects(
        register({ spec: BROKEN_SPEC, options: { ssr: 'required' } }),
        (error) => {
          assert.match(error.message, /Server rendering is required/);
          assert.match(error.message, /\/api\/pets/);
          assert.match(error.message, /Unsupported specification/);
          return true;
        },
      );
    });

    test('ssr: false never renders, so it can not fail', async () => {
      const { routes } = await register({
        spec: BROKEN_SPEC,
        options: { ssr: false },
      });
      assertPrefixRoute(routes);
    });
  });
});
