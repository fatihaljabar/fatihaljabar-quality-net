'use strict';

// Tests for specs/026-documentation-drift.md: the documentation says what the code does. Reads files only.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const names = (text) => new Set(text.match(/\bGEMINI_[A-Z_]+\b/g) || []);

test('[026/AC-1] names the same Gemini model variables in the API readme and in the sample configuration', () => {
  const readme = names(read('api/README.md'));
  const sample = names(read('api/config/application.yml.sample'));
  const models = (set) => [...set].filter((n) => n.endsWith('_MODEL')).sort();

  assert.deepEqual(models(readme), models(sample));
});

test('[026/AC-2] uses the port the API documents in the web sample environment file and the web readme', () => {
  const port = read('api/README.md').match(/Runs on \*\*port (\d+)\*\* by default/)[1];
  const sample = read('web/.env.example');

  assert.match(sample, new RegExp(`^VITE_API_BASE_URL=http://localhost:${port}/api/v1$`, 'm'));
  assert.match(sample, new RegExp(`^VITE_WS_BASE_URL=ws://localhost:${port}$`, 'm'));
  assert.match(read('web/README.md'), new RegExp(`default: \`http://localhost:${port}\``));
});

test('[026/AC-3] tells the reader to enter only folders that exist', () => {
  const folders = [...read('api/README.md').matchAll(/cd \.\.\/([\w-]+)|\(in `([\w-]+)\/`\)/g)].map((m) => m[1] || m[2]);

  assert.ok(folders.length > 0, 'found no folder to check');
  for (const folder of folders) assert.ok(existsSync(join(root, folder)), `${folder} does not exist`);
});

test('[026/AC-4] names the major version of Vite that the web project uses', () => {
  const major = JSON.parse(read('web/package.json')).devDependencies.vite.match(/\d+/)[0];

  assert.match(read('web/README.md'), new RegExp(`\\*\\*Vite ${major}\\*\\*`));
});
