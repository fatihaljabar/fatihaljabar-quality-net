#!/usr/bin/env node
'use strict';

// Release gate. Implements specs/008-release-gate.md.
// CLI: node tools/release-check.js --tag v1.0.0 --tests passed|failed [--out release-status.md]
// Decides RELEASABLE or BLOCKED from data and exits non-zero when BLOCKED.

const { readFileSync, readdirSync, existsSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

// A tag counts only when it opens a test name, so a tag-looking string inside a fixture does not.
const TAG = /\b(?:it|test)\s*\(?\s*['"`]\[(\d{3})\/AC-(\d+)\]/g;
const BARE_TAG = /\b(?:it|test)\s*\(?\s*['"`]\[AC-\d+\]/g;

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const plain = (text) => text.replace(/[*_`]/g, '').trim();

// The audit's ranked table. Returns null when no table with the columns we need is found.
function parseAudit(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\|/.test(l) && /\bID\b/.test(l) && /\bSev\b/.test(l) && /status/i.test(l));
  if (start === -1) return null;
  const head = cells(lines[start]).map((c) => c.toLowerCase());
  const col = { id: head.indexOf('id'), sev: head.indexOf('sev'), status: head.findIndex((c) => c.includes('status')) };
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!/^\|/.test(line)) break;
    const c = cells(line);
    rows.push({ id: plain(c[col.id] || ''), sev: plain(c[col.sev] || ''), status: c[col.status] || '' });
  }
  return rows;
}

function auditReasons(audit, accepted) {
  const reasons = [];
  const rows = parseAudit(audit);
  if (!rows) return [{ ac: 'AC-8', message: 'The audit table could not be read, so open findings cannot be checked.' }];

  const serious = rows.filter((r) => /^P[01]\b/.test(r.sev));
  if (serious.length === 0) return [{ ac: 'AC-8', message: 'The audit table holds no P0 or P1 rows, so nothing was checked.' }];

  for (const row of serious) {
    const status = plain(row.status).toLowerCase();
    if (status.startsWith('fixed')) continue;
    if (status.startsWith('remaining')) {
      reasons.push({ ac: 'AC-1', message: `${row.sev.split(' ')[0]} finding ${row.id} is still open.` });
    } else if (status.startsWith('accepted')) {
      const owner = (plain(row.status).match(/owner:\s*([^,;)]+)/i) || [])[1];
      if (owner) accepted.push({ id: row.id, owner: owner.trim(), status: plain(row.status) });
      else reasons.push({ ac: 'AC-2', message: `${row.id} is accepted but names no owner.` });
    } else {
      reasons.push({ ac: 'AC-8', message: `${row.id} has a status that is not Fixed, Remaining or Accepted: "${plain(row.status).slice(0, 40)}".` });
    }
  }
  return reasons;
}

// Criteria of one spec: { 'NNN/AC-n': { verifiedByPipeline } }.
function criteriaOf(spec) {
  const section = (spec.text.split(/^## Acceptance Criteria\s*$/m)[1] || '').split(/^## /m)[0];
  const blocks = section.split(/^(?=- \*\*AC-\d+\*\*)/m).filter((b) => /^- \*\*AC-\d+\*\*/.test(b));
  return blocks.map((b) => [`${spec.id}/AC-${b.match(/^- \*\*AC-(\d+)\*\*/)[1]}`, /Verified by:/.test(b)]);
}

function traceabilityReasons(specs, tests) {
  const reasons = [];
  const criteria = new Map(specs.flatMap(criteriaOf));
  const tagged = new Set();
  let bare = 0;
  for (const { text } of tests) {
    for (const m of text.matchAll(TAG)) tagged.add(`${m[1]}/AC-${m[2]}`);
    bare += (text.match(BARE_TAG) || []).length;
  }
  for (const [id, verifiedByPipeline] of criteria) {
    if (!tagged.has(id) && !verifiedByPipeline) reasons.push({ ac: 'AC-3', message: `Criterion ${id} has no test tagged with it.` });
  }
  for (const id of tagged) {
    if (!criteria.has(id)) reasons.push({ ac: 'AC-4', message: `A test is tagged ${id}, which no spec defines.` });
  }
  if (bare > 0) reasons.push({ ac: 'AC-4', message: `${bare} tests carry a tag without a spec number, so they trace to nothing.` });
  return reasons;
}

function evaluate({ audit, specs, tests, notes, tag, testsPassed }) {
  const accepted = [];
  const reasons = [];
  if (!testsPassed) reasons.push({ ac: 'AC-6', message: 'The tests failed.' });
  reasons.push(...auditReasons(audit, accepted));
  reasons.push(...traceabilityReasons(specs, tests));

  const version = tag.replace(/^v/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`^#{1,3}\\s+v?${version}(?![\\w.])`, 'm').test(notes || '')) {
    reasons.push({ ac: 'AC-5', message: `The release notes have no section for ${tag}.` });
  }
  return { verdict: reasons.length ? 'BLOCKED' : 'RELEASABLE', reasons, accepted };
}

// The verdict comes first, in words a person who does not read logs can act on.
function renderReport(result, tag) {
  const out = [`# ${tag}: ${result.verdict}`, ''];
  if (result.verdict === 'RELEASABLE') {
    out.push('This version passed every release check: the tests, the open findings, the traceability of the specs and the release notes.');
  } else {
    out.push('**This version must not be released.** The reasons are below; fix them or accept the risk in writing with an owner.', '', '## Why it is blocked');
    for (const r of result.reasons) out.push(`- (${r.ac}) ${r.message}`);
  }
  if (result.accepted.length) {
    out.push('', '## Accepted risks');
    for (const a of result.accepted) out.push(`- ${a.id}, owner ${a.owner}: ${a.status}`);
  }
  return out.join('\n') + '\n';
}

function collect(root) {
  const read = (p) => readFileSync(join(root, p), 'utf8');
  const specs = readdirSync(join(root, 'specs')).filter((f) => /^\d{3}-.*\.md$/.test(f))
    .map((f) => ({ id: f.slice(0, 3), text: read(join('specs', f)) }));
  const files = [
    ...readdirSync(join(root, 'api/spec'), { recursive: true }).filter((f) => f.endsWith('_spec.rb')).map((f) => join('api/spec', f)),
    ...readdirSync(join(root, 'tools')).filter((f) => f.endsWith('.test.js')).map((f) => join('tools', f)),
  ];
  return {
    audit: read('assessment/01-audit.md'),
    specs,
    tests: files.map((file) => ({ file, text: read(file) })),
    notes: existsSync(join(root, 'RELEASE_NOTES.md')) ? read('RELEASE_NOTES.md') : '',
  };
}

function main() {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? undefined : process.argv[i + 1]; };
  const tag = arg('tag');
  if (!tag || !['passed', 'failed'].includes(arg('tests'))) {
    console.error('usage: node tools/release-check.js --tag v1.0.0 --tests passed|failed [--out release-status.md]');
    process.exit(2);
  }
  const result = evaluate({ ...collect(process.cwd()), tag, testsPassed: arg('tests') === 'passed' });
  const report = renderReport(result, tag);
  if (arg('out')) writeFileSync(arg('out'), report);
  process.stdout.write(report);
  process.exit(result.verdict === 'RELEASABLE' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { evaluate, renderReport, parseAudit };
