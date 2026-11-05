const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { pickDownloadUrl } = require('../dist/utils/downloadUrl');

describe('pickDownloadUrl', () => {
  const route = '/docs/api/pets';

  test('is nothing without a url', () => {
    assert.equal(
      pickDownloadUrl({
        url: undefined,
        withBaseUrl: '/docs/',
        routeBaseUrl: route,
      }),
      undefined,
    );
    assert.equal(
      pickDownloadUrl({ url: '', withBaseUrl: '/docs/', routeBaseUrl: route }),
      undefined,
    );
  });

  test('by default a relative url is relative to the baseUrl', () => {
    assert.equal(
      pickDownloadUrl({
        url: 'redocusaurus/pets.yaml',
        withBaseUrl: '/docs/redocusaurus/pets.yaml',
        routeBaseUrl: route,
      }),
      '/docs/redocusaurus/pets.yaml',
    );
  });

  test('keeps an absolute url as it is, whatever the settings', () => {
    ['https://example.com/openapi.yaml', '//example.com/openapi.yaml'].forEach(
      (url) => {
        [true, false].forEach((normalize) => {
          assert.equal(
            pickDownloadUrl({
              url,
              normalize,
              withBaseUrl: url,
              routeBaseUrl: route,
            }),
            url,
          );
        });
      },
    );
  });

  test('without normalizing, a relative url is relative to the API route, not the page', () => {
    // read against the page, `openapi.yaml` would be /docs/api/pets/pets/openapi.yaml
    assert.equal(
      pickDownloadUrl({
        url: 'openapi.yaml',
        normalize: false,
        withBaseUrl: '/docs/openapi.yaml',
        routeBaseUrl: route,
      }),
      '/docs/api/pets/openapi.yaml',
    );
    assert.equal(
      pickDownloadUrl({
        url: './openapi.yaml',
        normalize: false,
        withBaseUrl: '/docs/openapi.yaml',
        routeBaseUrl: route,
      }),
      '/docs/api/pets/openapi.yaml',
    );
  });

  test('without normalizing and without a route, leaves it alone', () => {
    assert.equal(
      pickDownloadUrl({
        url: 'openapi.yaml',
        normalize: false,
        withBaseUrl: '/openapi.yaml',
        routeBaseUrl: '',
      }),
      'openapi.yaml',
    );
  });
});
