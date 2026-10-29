'use strict';

// Tests for specs/009-web-lockfile.md. They read the files only; nothing is installed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const web = join(__dirname, '..', 'web');
const lockPath = join(web, 'package-lock.json');
const lock = () => JSON.parse(readFileSync(lockPath, 'utf8'));

test('[009/AC-1] the lockfile exists and records the dependencies that package.json declares', () => {
  assert.ok(existsSync(lockPath), 'web/package-lock.json is missing');
  const pkg = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8'));
  const root = lock().packages[''];
  assert.deepEqual(root.dependencies, pkg.dependencies);
  assert.deepEqual(root.devDependencies, pkg.devDependencies);
});

test('[009/AC-2] every locked package comes from the public registry and has an integrity hash', () => {
  assert.ok(existsSync(lockPath), 'web/package-lock.json is missing');
  const offenders = Object.entries(lock().packages)
    .filter(([name]) => name !== '')
    .filter(([, p]) => !(typeof p.resolved === 'string' && p.resolved.startsWith('https://registry.npmjs.org/') && p.integrity))
    .map(([name]) => name);
  assert.deepEqual(offenders, []);
});
