const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { collectRoutes, mergeStyles } = require('../dist/ssr');

describe('collectRoutes', () => {
  test('collects the link of every item, nested ones included', () => {
    const items = [
      { link: '/api/pets' },
      {
        link: '/api/pets/pets',
        items: [
          { link: '/api/pets/pets/listpets' },
          { link: '/api/pets/pets/addpet' },
        ],
      },
    ];
    assert.deepEqual(collectRoutes(items), [
      '/api/pets',
      '/api/pets/pets',
      '/api/pets/pets/listpets',
      '/api/pets/pets/addpet',
    ]);
  });

  test('keeps each route once, without a trailing slash', () => {
    const items = [
      { link: '/api/pets/' },
      { link: '/api/pets' },
      { items: [{ link: '/api/pets/pets/' }, { link: '/api/pets/pets' }] },
    ];
    assert.deepEqual(collectRoutes(items), ['/api/pets', '/api/pets/pets']);
  });

  test('keeps "/" as it is', () => {
    assert.deepEqual(collectRoutes([{ link: '/' }]), ['/']);
  });

  test('skips items without a link, and links that are not paths', () => {
    const items = [
      { label: 'a separator' },
      { link: 'https://example.com/docs' },
      { link: '' },
      { link: '/api/pets' },
    ];
    assert.deepEqual(collectRoutes(items), ['/api/pets']);
  });

  test('copes with nothing', () => {
    assert.deepEqual(collectRoutes(undefined), []);
    assert.deepEqual(collectRoutes([]), []);
  });
});

describe('mergeStyles', () => {
  const tag = (...rules) =>
    `<style data-styled="true" data-styled-version="6.4.1">${rules
      .map((rule) => `${rule}/*!sc*/\n`)
      .join('')}</style>`;

  test('keeps every distinct rule once, in order of first appearance', () => {
    const merged = mergeStyles([
      tag('.a{color:red}', '.b{color:blue}'),
      tag('.b{color:blue}', '.c{color:green}'),
      tag('.a{color:red}', '.d{color:pink}'),
    ]);
    assert.equal(
      merged,
      '.a{color:red}\n.b{color:blue}\n.c{color:green}\n.d{color:pink}\n',
    );
  });

  test('keeps media rules as a whole', () => {
    const merged = mergeStyles([
      tag('@media (min-width:600px){.a{color:red}}', '.b{color:blue}'),
    ]);
    assert.equal(
      merged,
      '@media (min-width:600px){.a{color:red}}\n.b{color:blue}\n',
    );
  });

  test('reads several style tags in one string', () => {
    const merged = mergeStyles([`${tag('.a{x:1}')}${tag('.b{x:2}')}`]);
    assert.equal(merged, '.a{x:1}\n.b{x:2}\n');
  });

  test('ignores blank rules and text outside style tags', () => {
    const merged = mergeStyles([
      `junk${tag('.a{x:1}', '   ', '\n')}<div>not css{}</div>`,
    ]);
    assert.equal(merged, '.a{x:1}\n');
  });

  test('gives an empty stylesheet for no styles', () => {
    assert.equal(mergeStyles([]), '\n');
    assert.equal(mergeStyles(['']), '\n');
  });
});
