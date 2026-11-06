const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_OPTIONS, PluginOptionSchema } = require('../dist/options');

describe('the ssr option', () => {
  test('is on by default', () => {
    assert.equal(DEFAULT_OPTIONS.ssr, true);
    const { value, error } = PluginOptionSchema.validate({ spec: 'x.yaml' });
    assert.equal(error, undefined);
    assert.equal(value.ssr, true);
  });

  [true, false, 'required'].forEach((ssr) => {
    test(`accepts ${JSON.stringify(ssr)}`, () => {
      const { value, error } = PluginOptionSchema.validate({
        spec: 'x.yaml',
        ssr,
      });
      assert.equal(error, undefined);
      assert.equal(value.ssr, ssr);
    });
  });

  ['bogus', 3, null, {}].forEach((ssr) => {
    test(`rejects ${JSON.stringify(ssr)}`, () => {
      const { error } = PluginOptionSchema.validate({ spec: 'x.yaml', ssr });
      assert.ok(error, 'expected a validation error');
    });
  });
});
