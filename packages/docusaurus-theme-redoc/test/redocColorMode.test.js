const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  REDOC_COLOR_MODE_KEY,
  REDOC_MODE_CLASSES,
  REDOC_SWITCHER_SELECTOR,
  reconcileColorMode,
  redocModeOf,
  storeRedocColorMode,
} = require('../dist/utils/redocColorMode');

/** A stand-in for <html> with the given classes. */
function html(...classes) {
  return { classList: { contains: (name) => classes.includes(name) } };
}

describe('reconcileColorMode', () => {
  test('does nothing when Redoc and Docusaurus agree', () => {
    assert.equal(reconcileColorMode(html('dark'), 'dark'), undefined);
    assert.equal(reconcileColorMode(html('light'), 'light'), undefined);
  });

  test('follows Redoc when its own switcher changed the mode', () => {
    assert.deepEqual(reconcileColorMode(html('light'), 'dark'), {
      type: 'follow',
      mode: 'light',
    });
    assert.deepEqual(reconcileColorMode(html('dark'), 'light'), {
      type: 'follow',
      mode: 'dark',
    });
  });

  test("restores the current mode's class when Redoc's class is gone", () => {
    // Docusaurus re-applies its own class on navigation, wiping Redoc's
    assert.deepEqual(reconcileColorMode(html(), 'dark'), {
      type: 'restore',
      mode: 'dark',
    });
    assert.deepEqual(reconcileColorMode(html('other-class'), 'light'), {
      type: 'restore',
      mode: 'light',
    });
  });
});

describe('redocModeOf', () => {
  test('reads the mode Redoc has applied to <html>', () => {
    assert.equal(redocModeOf(html('dark')), 'dark');
    assert.equal(redocModeOf(html('light', 'other-class')), 'light');
    assert.equal(redocModeOf(html('other-class')), undefined);
  });
});

describe('storeRedocColorMode', () => {
  const original = globalThis.window;
  afterEach(() => {
    if (original === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = original;
    }
  });

  test('stores the mode under the key Redoc reads', () => {
    const stored = {};
    globalThis.window = {
      localStorage: { setItem: (key, value) => (stored[key] = value) },
    };
    storeRedocColorMode('dark');
    assert.deepEqual(stored, { 'redoc.colorMode': 'dark' });
    assert.equal(REDOC_COLOR_MODE_KEY, 'redoc.colorMode');
  });

  test('copes with storage that is unavailable', () => {
    globalThis.window = {
      localStorage: {
        setItem: () => {
          throw new Error('denied');
        },
      },
    };
    assert.doesNotThrow(() => storeRedocColorMode('light'));
  });

  test('has the two classes Redoc uses', () => {
    assert.deepEqual([...REDOC_MODE_CLASSES], ['light', 'dark']);
  });
});

// The sync relies on things Redoc 3 does not document (see
// src/utils/redocColorMode.ts). redoc is pinned, so an upgrade is deliberate:
// if one of these fails, check the sync still works before changing the test.
describe('what Redoc 3 does, which the sync relies on', () => {
  const bundle = fs.readFileSync(require.resolve('redoc'), 'utf8');

  test('it reads and writes its color mode in localStorage under the key we set', () => {
    assert.ok(
      bundle.includes(`\`${REDOC_COLOR_MODE_KEY}\``),
      `Redoc no longer mentions ${REDOC_COLOR_MODE_KEY}`,
    );
    assert.match(bundle, /localStorage\.getItem\(`redoc\.colorMode`\)/);
  });

  test('its modes are the classes we put back and watch for', () => {
    assert.match(bundle, /LIGHT:`light`,DARK:`dark`/);
  });

  test('it has a color mode switcher that changes the mode in place', () => {
    // A two-state toggle with data-testid="color-mode-switcher": the sync clicks
    // it, so a change from Docusaurus reaches Redoc without remounting it.
    assert.equal(
      REDOC_SWITCHER_SELECTOR,
      '[data-testid="color-mode-switcher"]',
    );
    assert.match(
      bundle,
      /"data-testid":`color-mode-switcher`,onClick:\(\)=>\{let [a-z]=[a-z]===[\w$.]+\.DARK\?[\w$.]+\.LIGHT:[\w$.]+\.DARK/,
    );
  });

  test('it applies the mode as a class on <html>', () => {
    assert.match(
      bundle,
      /document\.documentElement;.{0,80}classList\.add\([a-z],`notransition`\)/,
    );
  });
});
