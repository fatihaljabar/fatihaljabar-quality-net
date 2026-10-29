'use strict';

// Tests for specs/001-quality-gate.md. Each test name carries its AC id for traceability.
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('./dor-check');

const GOOD_SPEC = `# Spec 999: example

## Spec
Something worth building.

## Acceptance Criteria
- **AC-1** Given a thing, When it happens, Then it works.

## Design Plan
Small change in one module.

## Definition of Done
- [ ] tests pass
`;

const specs = { 'specs/999-example.md': GOOD_SPEC };
const readSpec = (path) => specs[path] ?? null;
const bodyWith = (path) => `## Summary\nx\n\nSpec: ${path}\n`;
const run = (body, files, extra = {}) => evaluate({ body, files, readSpec: extra.readSpec ?? readSpec });
const ids = (result) => result.failures.map((f) => f.ac);

test('[001/AC-1] fails when the PR body has no Spec line', () => {
  const r = run('## Summary\nno link here', ['api/app/models/session.rb', 'api/spec/session_spec.rb']);
  assert.deepEqual(ids(r), ['AC-1']);
});

test('[001/AC-1] fails when the Spec line points at a file that does not exist', () => {
  const r = run(bodyWith('specs/404-missing.md'), ['api/app/models/session.rb', 'api/spec/session_spec.rb']);
  assert.deepEqual(ids(r), ['AC-1']);
});

test('[001/AC-1] rejects a spec path that escapes the specs directory', () => {
  const r = run('Spec: specs/../../etc/passwd.md', ['web/src/App.tsx', 'web/src/App.test.tsx']);
  assert.deepEqual(ids(r), ['AC-1']);
});

test('[001/AC-2] fails and names every incomplete section', () => {
  const broken = '# s\n\n## Spec\ntext\n\n## Acceptance Criteria\n- **AC-1** Given a, When b, Then c.\n\n## Design Plan\n\n';
  const r = run(bodyWith('specs/998-broken.md'), ['assessment/01-audit.md', 'api/app/x.rb', 'api/spec/x_spec.rb'], {
    readSpec: (p) => (p === 'specs/998-broken.md' ? broken : null),
  });
  assert.deepEqual(ids(r), ['AC-2']);
  assert.match(r.failures[0].message, /Design Plan/);
  assert.match(r.failures[0].message, /Definition of Done/);
});

test('[001/AC-3] fails when no criterion has Given, When and Then', () => {
  const noGwt = GOOD_SPEC.replace('Given a thing, When it happens, Then it works.', 'It should work.');
  const r = run(bodyWith('specs/997-nogwt.md'), ['api/app/x.rb', 'api/spec/x_spec.rb'], {
    readSpec: (p) => (p === 'specs/997-nogwt.md' ? noGwt : null),
  });
  assert.deepEqual(ids(r), ['AC-3']);
});

test('[001/AC-4] fails when production code changes without a test', () => {
  const r = run(bodyWith('specs/999-example.md'), ['api/app/models/session.rb']);
  assert.deepEqual(ids(r), ['AC-4']);
});

test('[001/AC-4] counts web and api test files as tests', () => {
  assert.deepEqual(ids(run(bodyWith('specs/999-example.md'), ['web/src/pages/A.tsx', 'web/src/pages/A.test.tsx'])), []);
  assert.deepEqual(ids(run(bodyWith('specs/999-example.md'), ['api/app/a.rb', 'api/spec/requests/a_spec.rb'])), []);
});

test('[001/AC-4] a change to the gate itself needs a test too', () => {
  const r = run(bodyWith('specs/999-example.md'), ['tools/dor-check.js']);
  assert.deepEqual(ids(r), ['AC-4']);
});

test('[001/AC-5] passes without spec or test when only exempt paths change', () => {
  const r = run('no spec line at all', ['assessment/01-audit.md', 'README.md', 'specs/002-new.md', 'RELEASE_NOTES.md']);
  assert.deepEqual(r.failures, []);
});

test('[001/AC-5] exemption is by path, so a label or checkbox in the body does not skip the gate', () => {
  const r = run('[x] docs only\nlabel: skip-gate', ['api/app/models/session.rb']);
  assert.ok(ids(r).includes('AC-1'));
  assert.ok(ids(r).includes('AC-4'));
});

test('[001/AC-5] workflow and ignore-file changes are not exempt', () => {
  const r = run('no spec', ['.github/workflows/gate.yml']);
  assert.deepEqual(ids(r), ['AC-1']);
});

test('[001/AC-6] passes and reports the validated spec path', () => {
  const r = run(bodyWith('specs/999-example.md'), ['api/app/models/session.rb', 'api/spec/models/session_spec.rb']);
  assert.deepEqual(r.failures, []);
  assert.equal(r.spec, 'specs/999-example.md');
});
