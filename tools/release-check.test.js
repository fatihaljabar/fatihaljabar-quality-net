'use strict';

// Tests for specs/008-release-gate.md. Each test name carries its spec and criterion id.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { evaluate, renderReport, testFiles } = require('./release-check');

const HEADER = '| # | ID | Sev | Cat | Impact | How found | Final status |\n|---|---|---|---|---|---|---|\n';
const auditWith = (...rows) =>
  `# Audit\n\n${HEADER}${rows.map(([id, sev, status], i) => `| ${i + 1} | ${id} | ${sev} | BW | impact | found | ${status} |`).join('\n')}\n`;

const SPEC = (id, ...criteria) => ({
  id,
  text: `# Spec ${id}\n\n## Acceptance Criteria\n${criteria.map((c, i) => `- **AC-${i + 1}** ${c}`).join('\n')}\n\n## Design Plan\nx\n`,
});
const TEST = (...tags) => ({ file: 'api/spec/example_spec.rb', text: tags.map((t) => `it '[${t}] does something'`).join('\n') });

// A world in which every condition holds, changed one field at a time by the tests.
const world = (over = {}) => ({
  audit: auditWith(['A1', 'P1', '**Fixed** (PR #1)'], ['A2', 'P0', '**Fixed** (PR #2)'], ['B1', 'P2', '**Remaining**']),
  specs: [SPEC('009', 'Given a, When b, Then c.', 'Given d, When e, Then f.')],
  tests: [TEST('009/AC-1', '009/AC-2')],
  notes: '# Release notes\n\n## v1.0.0\nWhat this version claims.\n',
  tag: 'v1.0.0',
  testsPassed: true,
  ...over,
});
const verdict = (over) => evaluate(world(over));
const acs = (result) => result.reasons.map((r) => r.ac);

test('[008/AC-1] blocks on a P1 row that is still remaining and names it', () => {
  const r = verdict({ audit: auditWith(['A7', 'P1', '**Remaining**'], ['A1', 'P1', '**Fixed** (PR #1)']) });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-1']);
  assert.match(r.reasons[0].message, /A7/);
});

test('[008/AC-1] blocks on a P0 row that is still remaining', () => {
  const r = verdict({ audit: auditWith(['A10', 'P0', '**Remaining**']) });
  assert.equal(r.verdict, 'BLOCKED');
  assert.match(r.reasons[0].message, /A10/);
});

test('[008/AC-1] does not block on fixed rows or on a remaining P2 or P3', () => {
  const r = verdict({ audit: auditWith(['A1', 'P1', '**Fixed** (PR #1)'], ['B2', 'P2', '**Remaining**'], ['B8', 'P3', '**Remaining**']) });
  assert.equal(r.verdict, 'RELEASABLE');
});

test('[008/AC-1] reads a severity written as "P1 (conditional)"', () => {
  const r = verdict({ audit: auditWith(['A8', 'P1 (conditional)', '**Remaining**']) });
  assert.equal(r.verdict, 'BLOCKED');
});

test('[008/AC-2] lets an accepted P1 through when it names an owner, and lists it', () => {
  const r = verdict({ audit: auditWith(['A7', 'P1', '**Accepted** owner: Fatih, reason: display only, ships with a note']) });
  assert.equal(r.verdict, 'RELEASABLE');
  assert.deepEqual(r.accepted.map((a) => [a.id, a.owner]), [['A7', 'Fatih']]);
});

test('[008/AC-2] blocks an accepted P1 that names no owner', () => {
  const r = verdict({ audit: auditWith(['A7', 'P1', '**Accepted** reason: it is fine']) });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-2']);
});

test('[008/AC-3] blocks on a criterion no test is tagged with and names it', () => {
  const r = verdict({ tests: [TEST('009/AC-1')] });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-3']);
  assert.match(r.reasons[0].message, /009\/AC-2/);
});

test('[008/AC-3] exempts a criterion that is marked as verified by CI', () => {
  const specs = [SPEC('009', 'Given a, When b, Then c.', 'Given d, When e, Then f. Verified by: the pipeline run.')];
  const r = verdict({ specs, tests: [TEST('009/AC-1')] });
  assert.equal(r.verdict, 'RELEASABLE');
});

test('[008/AC-10] does not exempt a criterion that only mentions the words without the colon', () => {
  const specs = [SPEC('009', 'Given a, When b, Then c.', 'Given d, When e, Then f. Nobody has verified by hand that this works.')];
  const r = verdict({ specs, tests: [TEST('009/AC-1')] });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-3']);
  assert.match(r.reasons[0].message, /009\/AC-2/);
});

test('[008/AC-10] does not exempt a criterion with the marker in another case', () => {
  const specs = [SPEC('009', 'Given a, When b, Then c.', 'Given d, When e, Then f. verified by: the pipeline run.')];
  const r = verdict({ specs, tests: [TEST('009/AC-1')] });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-3']);
});

test('[008/AC-4] blocks on a tag that names a criterion no spec defines', () => {
  const r = verdict({ tests: [TEST('009/AC-1', '009/AC-2', '009/AC-9')] });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-4']);
  assert.match(r.reasons[0].message, /009\/AC-9/);
});

test('[008/AC-4] blocks on a bare tag that does not say which spec it belongs to', () => {
  const r = verdict({ tests: [TEST('009/AC-1', '009/AC-2'), TEST('AC-1')] });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-4']);
});

test('[008/AC-5] blocks when the release notes have no section for the tag', () => {
  const r = verdict({ notes: '# Release notes\n\n## v1.0.1\nSomething else.\n' });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-5']);
});

test('[008/AC-5] finds the section when the heading carries a date', () => {
  const r = verdict({ notes: '# Release notes\n\n## v1.0.0 - 2026-10-29\nClaims.\n' });
  assert.equal(r.verdict, 'RELEASABLE');
});

test('[008/AC-6] blocks when the tests failed, whatever else holds', () => {
  const r = verdict({ testsPassed: false });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-6']);
});

test('[008/AC-7] is releasable when every condition holds', () => {
  const r = verdict();
  assert.equal(r.verdict, 'RELEASABLE');
  assert.deepEqual(r.reasons, []);
});

test('[008/AC-8] blocks when the audit holds no table', () => {
  const r = verdict({ audit: '# Audit\n\nNo table here.\n' });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-8']);
});

test('[008/AC-8] blocks when the table has no P0 or P1 rows', () => {
  const r = verdict({ audit: auditWith(['B1', 'P2', '**Remaining**']) });
  assert.equal(r.verdict, 'BLOCKED');
  assert.deepEqual(acs(r), ['AC-8']);
});

test('[008/AC-9] puts the verdict first in the report and lists every reason', () => {
  const blocked = renderReport(verdict({ audit: auditWith(['A7', 'P1', '**Remaining**']), testsPassed: false }), 'v1.0.0');
  assert.match(blocked.split('\n')[0], /BLOCKED/);
  assert.match(blocked, /A7/);
  assert.match(blocked, /tests/i);
  assert.match(renderReport(verdict(), 'v1.0.0').split('\n')[0], /RELEASABLE/);
});

test('[010/AC-6] collects the web tests too, so a criterion tested only there counts as tested', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-check-'));
  const files = ['api/spec/a_spec.rb', 'tools/b.test.js', 'web/src/components/c.test.tsx', 'web/src/d.test.ts',
    'web/src/not_a_test.tsx', 'web/node_modules/pkg/e.test.js'];
  for (const f of files) {
    fs.mkdirSync(path.join(root, path.dirname(f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), '');
  }

  assert.deepEqual(testFiles(root).sort(),
    ['api/spec/a_spec.rb', 'tools/b.test.js', 'web/src/components/c.test.tsx', 'web/src/d.test.ts']);
});

test('[008/AC-11] says a releasable version carries its accepted risks instead of claiming it passed everything', () => {
  const accepted = verdict({ audit: auditWith(['A7', 'P1', '**Accepted** owner: Fatih, reason: display only'], ['A8', 'P1', '**Accepted** owner: Fatih, reason: build only']) });
  const lines = renderReport(accepted, 'v1.0.0').split('\n');

  assert.match(lines[0], /RELEASABLE/);
  assert.match(lines[2], /2 accepted risks/);
  assert.match(lines[2], /not a clean release/i);
  assert.doesNotMatch(lines[2], /passed every release check/);
});

test('[008/AC-11] keeps the plain sentence when nothing is accepted', () => {
  const lines = renderReport(verdict(), 'v1.0.0').split('\n');

  assert.match(lines[2], /passed every release check/);
  assert.doesNotMatch(lines[2], /accepted/i);
});
