const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { shortHash, trimOperationIds } = require('../dist/specUtils');

/** Run `fn` and return what it passed to `console.warn`. */
function captureWarnings(fn) {
  const original = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

describe('shortHash', () => {
  test('is 12 hex characters and stable', () => {
    assert.match(shortHash('/api/pets'), /^[0-9a-f]{12}$/);
    assert.equal(shortHash('/api/pets'), shortHash('/api/pets'));
  });

  test('differs for different input', () => {
    assert.notEqual(shortHash('/api/pets'), shortHash('/api/store'));
  });
});

describe('trimOperationIds', () => {
  test('returns a copy with trimmed operationIds, and warns', () => {
    const spec = {
      paths: {
        '/pets': {
          get: { operationId: 'listPets ' },
          post: { operationId: ' addPet' },
        },
      },
    };
    let result;
    const warnings = captureWarnings(() => {
      result = trimOperationIds(spec, 'pets.yaml');
    });
    assert.equal(result.paths['/pets'].get.operationId, 'listPets');
    assert.equal(result.paths['/pets'].post.operationId, 'addPet');
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /pets\.yaml/);
    assert.match(warnings[0], /"listPets "/);
    assert.match(warnings[0], /GET \/pets/);
    assert.match(warnings[1], /POST \/pets/);
  });

  test('does not change the spec it is given', () => {
    const spec = {
      paths: { '/pets': { get: { operationId: 'listPets ', summary: 's' } } },
    };
    let result;
    captureWarnings(() => {
      result = trimOperationIds(spec, 'x');
    });
    assert.equal(spec.paths['/pets'].get.operationId, 'listPets ');
    assert.notEqual(result, spec);
    assert.notEqual(result.paths['/pets'], spec.paths['/pets']);
  });

  test('keeps everything else, and shares what it did not change', () => {
    const untouched = { get: { operationId: 'fine' } };
    const spec = {
      info: { title: 'T' },
      paths: {
        '/a': { get: { operationId: 'a ', summary: 'kept' }, parameters: [1] },
        '/b': untouched,
      },
    };
    let result;
    captureWarnings(() => {
      result = trimOperationIds(spec, 'x');
    });
    assert.equal(result.info, spec.info);
    assert.equal(result.paths['/b'], untouched);
    assert.equal(result.paths['/a'].get.summary, 'kept');
    assert.deepEqual(result.paths['/a'].parameters, [1]);
  });

  test('returns the same object when nothing needs trimming, without warning', () => {
    const spec = { paths: { '/pets': { get: { operationId: 'listPets' } } } };
    let result;
    const warnings = captureWarnings(() => {
      result = trimOperationIds(spec, 'x');
    });
    assert.deepEqual(warnings, []);
    assert.equal(result, spec);
  });

  test('ignores keys that are not operations, and non-string ids', () => {
    const spec = {
      paths: {
        '/pets': {
          parameters: [{ name: 'id' }],
          summary: ' not an operation ',
          get: { operationId: 42 },
          put: {},
        },
      },
    };
    let result;
    const warnings = captureWarnings(() => {
      result = trimOperationIds(spec, 'x');
    });
    assert.deepEqual(warnings, []);
    assert.equal(result, spec);
  });

  test('copes with a spec that has no paths', () => {
    assert.doesNotThrow(() => trimOperationIds({}, 'x'));
    assert.doesNotThrow(() => trimOperationIds({ paths: undefined }, 'x'));
  });
});
