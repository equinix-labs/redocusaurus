const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  legacyHashToPath,
  redirectLegacyHash,
} = require('../dist/utils/legacyHash');

describe('legacyHashToPath', () => {
  const mapped = [
    ['#tag/Pets', '/pets'],
    ['#/tag/Pets', '/pets'],
    ['#tag/Pets/', '/pets'],
    ['#tag/Pets/operation/addPet', '/pets/addpet'],
    ['#tag/Pets/operation/addPet/', '/pets/addpet'],
    // the tag and the operation id are lowercased, encoded spaces are kept
    [
      '#tag/Orders/operation/GET%20Order%20details',
      '/orders/get%20order%20details',
    ],
  ];
  mapped.forEach(([hash, path]) => {
    test(`${hash} -> ${path}`, () => {
      assert.equal(legacyHashToPath(hash), path);
    });
  });

  const unmapped = [
    '',
    '#',
    // no tag to build a path from
    '#operation/addPet',
    // no route in Redoc 3
    '#section/Authentication',
    '#schema/Pet',
    // not a legacy hash
    'tag/Pets',
    '#tag/',
    '#tag/Pets/extra/segments',
  ];
  unmapped.forEach((hash) => {
    test(`${JSON.stringify(hash)} is left alone`, () => {
      assert.equal(legacyHashToPath(hash), undefined);
    });
  });
});

describe('redirectLegacyHash', () => {
  afterEach(() => {
    delete global.window;
  });

  /** A minimal `window` that records what is written to the history. */
  function fakeWindow(hash, search = '') {
    const calls = [];
    global.window = {
      location: { hash, search },
      history: {
        state: { from: 'test' },
        replaceState: (...args) => calls.push(args),
      },
    };
    return calls;
  }

  test('rewrites the URL below the base path, keeping the query string', () => {
    const calls = fakeWindow('#tag/Pets/operation/addPet', '?a=1');
    assert.equal(redirectLegacyHash('/api/pets'), true);
    assert.deepEqual(calls, [
      [{ from: 'test' }, '', '/api/pets/pets/addpet?a=1'],
    ]);
  });

  test('works for a base path of "/"', () => {
    const calls = fakeWindow('#tag/Pets');
    assert.equal(redirectLegacyHash('/'), true);
    assert.equal(calls[0][2], '/pets');
  });

  test('does nothing for a hash that can not be mapped', () => {
    const calls = fakeWindow('#section/Authentication');
    assert.equal(redirectLegacyHash('/api/pets'), false);
    assert.deepEqual(calls, []);
  });
});
