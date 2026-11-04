const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const plugin = require('../dist/index');

const SPEC = `openapi: 3.0.3
info: { title: Pets, version: '1.0.0' }
paths:
  /pets:
    get:
      operationId: "listPets "
      responses: { '200': { description: ok } }
`;

describe('loadContent', () => {
  let dir;
  let specFile;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redocusaurus-test-'));
    specFile = path.join(dir, 'pets.yaml');
    fs.writeFileSync(specFile, SPEC);
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  async function load() {
    const instance = plugin.default(
      {
        siteConfig: { baseUrl: '/' },
        i18n: { currentLocale: 'en', defaultLocale: 'en' },
        outDir: dir,
        siteDir: dir,
      },
      { id: 'pets', spec: specFile, route: '/api', themeId: 't' },
    );
    const original = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      return { content: await instance.loadContent(), warnings };
    } finally {
      console.warn = original;
    }
  }

  test('renders from trimmed operationIds', async () => {
    const { content, warnings } = await load();
    assert.equal(content.converted.paths['/pets'].get.operationId, 'listPets');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /listPets /);
  });

  test('leaves the downloadable spec as the author wrote it', async () => {
    const { content } = await load();
    assert.equal(content.bundle.paths['/pets'].get.operationId, 'listPets ');
    assert.notEqual(content.converted, content.bundle);
  });
});
