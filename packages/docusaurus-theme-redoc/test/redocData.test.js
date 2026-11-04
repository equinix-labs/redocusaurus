const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const redocDataPath = require.resolve('../dist/redocData');
const { buildThemeCss } = require(redocDataPath);

/** The value of a custom property in one rule of the stylesheet. */
function tokenIn(css, selector, name) {
  const escaped = selector.replace(/[.]/g, '\\.');
  const rule = new RegExp(`${escaped}\\{([^}]*)\\}`).exec(css);
  if (!rule) {
    return undefined;
  }
  const declaration = rule[1]
    .split(';')
    .find((entry) => entry.startsWith(`${name}:`));
  return declaration ? declaration.slice(name.length + 1) : undefined;
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

describe('buildThemeCss', () => {
  test('follows the Docusaurus (Infima) variables by default', () => {
    const css = buildThemeCss({});
    assert.match(css, /^html:root\{/);
    assert.equal(
      tokenIn(css, 'html:root', '--font-family-base'),
      'var(--ifm-font-family-base)',
    );
    assert.equal(
      tokenIn(css, 'html:root', '--color-primary-base'),
      'var(--ifm-color-primary)',
    );
    assert.equal(
      tokenIn(css, 'html:root', '--bg-color'),
      'var(--ifm-background-surface-color)',
    );
    assert.equal(tokenIn(css, 'html:root', '--sidebar-width'), '300px');
  });

  test('has no dark block unless something is set for dark mode', () => {
    assert.doesNotMatch(buildThemeCss({}), /html:root\.dark/);
  });

  test('primaryColor sets the primary tokens and derives the shades', () => {
    const css = buildThemeCss({ primaryColor: '#1890ff' });
    assert.equal(tokenIn(css, 'html:root', '--color-primary-base'), '#1890ff');
    assert.equal(tokenIn(css, 'html:root', '--link-color-primary'), '#1890ff');
    assert.equal(
      tokenIn(css, 'html:root', '--color-primary-hover'),
      'color-mix(in srgb, #1890ff 85%, black)',
    );
  });

  test('dark mode falls back to primaryColor, with shades towards white', () => {
    const css = buildThemeCss({ primaryColor: '#1890ff' });
    assert.equal(
      tokenIn(css, 'html:root.dark', '--color-primary-base'),
      '#1890ff',
    );
    assert.equal(
      tokenIn(css, 'html:root.dark', '--color-primary-hover'),
      'color-mix(in srgb, #1890ff 85%, white)',
    );
  });

  test('primaryColorDark overrides the color in dark mode only', () => {
    const css = buildThemeCss({
      primaryColor: '#1890ff',
      primaryColorDark: '#69c0ff',
    });
    assert.equal(tokenIn(css, 'html:root', '--color-primary-base'), '#1890ff');
    assert.equal(
      tokenIn(css, 'html:root.dark', '--color-primary-base'),
      '#69c0ff',
    );
  });

  test('cssVariables accepts names with or without the leading dashes', () => {
    const css = buildThemeCss({
      cssVariables: {
        light: { 'sidebar-width': '320px', '--font-size-base': '15px' },
        dark: { 'bg-color': '#000' },
      },
    });
    assert.equal(tokenIn(css, 'html:root', '--sidebar-width'), '320px');
    assert.equal(tokenIn(css, 'html:root', '--font-size-base'), '15px');
    assert.equal(tokenIn(css, 'html:root.dark', '--bg-color'), '#000');
  });

  test('cssVariables win over primaryColor and the defaults', () => {
    const css = buildThemeCss({
      primaryColor: '#111111',
      cssVariables: {
        light: { 'color-primary-base': '#222222', 'sidebar-width': '1px' },
      },
    });
    assert.equal(tokenIn(css, 'html:root', '--color-primary-base'), '#222222');
    assert.equal(tokenIn(css, 'html:root', '--sidebar-width'), '1px');
  });

  test('skips a value that could end the rule early, and warns', async () => {
    let css;
    const warnings = await captureWarnings(() => {
      css = buildThemeCss({
        cssVariables: {
          light: { bad: 'red; } body { display: none', ok: '1px', num: 5 },
        },
      });
    });
    assert.doesNotMatch(css, /display/);
    assert.equal(tokenIn(css, 'html:root', '--ok'), '1px');
    assert.equal(tokenIn(css, 'html:root', '--bad'), undefined);
    assert.equal(tokenIn(css, 'html:root', '--num'), undefined);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /"bad"/);
  });
});

describe('getGlobalData', () => {
  // The deprecation warning is printed once per process, so load a fresh copy
  // of the module for each test.
  function freshGetGlobalData() {
    delete require.cache[redocDataPath];
    return require(redocDataPath).getGlobalData;
  }

  afterEach(() => {
    delete require.cache[redocDataPath];
  });

  test('turns Redoc telemetry off by default', async () => {
    const data = await freshGetGlobalData()({ options: {} });
    assert.equal(data.options.disableTelemetry, true);
    assert.equal(data.options.scrollYOffset, 'nav.navbar');
  });

  test('lets a site turn telemetry back on', async () => {
    const data = await freshGetGlobalData()({
      options: { disableTelemetry: false },
    });
    assert.equal(data.options.disableTelemetry, false);
  });

  test('lets a site override the other defaults', async () => {
    const data = await freshGetGlobalData()({
      options: { expandSingleSchemaField: false },
    });
    assert.equal(data.options.expandSingleSchemaField, false);
    assert.equal(data.options.menuToggle, true);
  });

  test('returns the theme stylesheet built from the options', async () => {
    const data = await freshGetGlobalData()({
      primaryColor: '#1890ff',
      options: {},
    });
    assert.equal(
      tokenIn(data.css, 'html:root', '--color-primary-base'),
      '#1890ff',
    );
  });

  test('ignores the Redoc 2 theme object and warns once', async () => {
    const getGlobalData = freshGetGlobalData();
    const oldTheme = { colors: { primary: { main: '#000' } } };
    let first;
    const warnings = await captureWarnings(async () => {
      first = await getGlobalData({ theme: oldTheme, options: {} });
      // set again, in the theme option and in the options (as `redocly.yaml`)
      await getGlobalData({ theme: oldTheme, options: { theme: oldTheme } });
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /ignored/);
    assert.equal('theme' in first.options, false);
  });

  test('does not warn when no theme object is set', async () => {
    const warnings = await captureWarnings(async () => {
      const data = await freshGetGlobalData()({
        options: { theme: {} },
      });
      assert.equal('theme' in data.options, false);
    });
    assert.deepEqual(warnings, []);
  });
});
