'use strict';

// Tests for specs/027-workflow-concurrency.md. They read the workflow file only; how GitHub evaluates a group is proven on the
// real workflows after the merge.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const api = readFileSync(join(__dirname, '..', '.github', 'workflows', 'api.yml'), 'utf8');
const concurrency = api.match(/^ {4}concurrency:\n {6}group: (.+)\n {6}cancel-in-progress: (.+)$/m);

test('[027/AC-1] puts the name of the starting workflow in the group of the API tests', () => {
  assert.ok(concurrency, 'the API tests job has no concurrency block');
  assert.match(concurrency[1], /github\.workflow/);
  assert.match(concurrency[1], /github\.ref/);
});

test('[027/AC-2] still cancels an older run of the same group', () => {
  assert.ok(concurrency, 'the API tests job has no concurrency block');
  assert.equal(concurrency[2].trim(), 'true');
});
