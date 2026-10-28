#!/usr/bin/env node
'use strict';

// Definition-of-Ready gate. Implements specs/001-quality-gate.md (AC-1 .. AC-6).
// CLI: PR_BODY="..." node tools/dor-check.js <base-ref>   (changed files come from git diff)

const { execFileSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

// All gate rules live here so they can be reviewed in one place.
const EXEMPT = [/^assessment\//, /^specs\//, /(^|\/)README\.md$/, /^RELEASE_NOTES\.md$/];
const TEST_FILES = [/^api\/spec\//, /\.(test|spec)\.[jt]sx?$/, /(^|\/)__tests__\//];
const PRODUCTION = [/^api\/(app|config|db)\//, /^web\/src\//, /^tools\//];
const SPEC_LINK = /^\s*Spec:\s*`?(specs\/[A-Za-z0-9._-]+\.md)`?\s*$/m;
const SECTIONS = ['Spec', 'Acceptance Criteria', 'Design Plan', 'Definition of Done'];

const matchesAny = (patterns, file) => patterns.some((p) => p.test(file));
const isExempt = (file) => matchesAny(EXEMPT, file);
const isTest = (file) => matchesAny(TEST_FILES, file);
const isProduction = (file) => !isTest(file) && matchesAny(PRODUCTION, file);

function sectionBody(spec, title) {
  const lines = spec.split('\n');
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

function validCriteria(acSection) {
  const items = acSection.split(/(?=\bAC-\d+\b)/).filter((i) => /^AC-\d+\b/.test(i));
  return items.filter((i) => /\bGiven\b[\s\S]*\bWhen\b[\s\S]*\bThen\b/.test(i));
}

function evaluate({ body, files, readSpec }) {
  const failures = [];
  const fail = (ac, message) => failures.push({ ac, message });
  const checked = files.filter((f) => !isExempt(f));
  if (checked.length === 0) return { failures, spec: null };

  const link = (body || '').match(SPEC_LINK);
  const specText = link ? readSpec(link[1]) : null;
  if (!link) fail('AC-1', 'PR body has no "Spec: specs/<name>.md" line.');
  else if (specText === null) fail('AC-1', `Spec link points to a file that does not exist: ${link[1]}`);

  if (specText !== null) {
    const incomplete = SECTIONS.filter((s) => !(sectionBody(specText, s) || '').trim());
    if (incomplete.length) fail('AC-2', `Spec ${link[1]} has missing or empty sections: ${incomplete.join(', ')}.`);
    const ac = sectionBody(specText, 'Acceptance Criteria') || '';
    if (validCriteria(ac).length === 0) fail('AC-3', `Spec ${link[1]} has no "AC-n ... Given ... When ... Then" criterion.`);
  }

  if (files.some(isProduction) && !files.some(isTest)) {
    fail('AC-4', 'Production code changed but no test file changed in this pull request.');
  }
  return { failures, spec: failures.length === 0 && link ? link[1] : null };
}

function changedFiles(base) {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function main() {
  const base = process.argv[2] || 'origin/main';
  const files = changedFiles(base);
  const readSpec = (p) => (existsSync(join(process.cwd(), p)) ? readFileSync(join(process.cwd(), p), 'utf8') : null);
  const { failures, spec } = evaluate({ body: process.env.PR_BODY || '', files, readSpec });

  console.log(`Changed files: ${files.length}`);
  if (failures.length) {
    for (const f of failures) console.log(`BLOCKED [${f.ac}] ${f.message}`);
    console.log('Definition of Ready: BLOCKED');
    process.exit(1);
  }
  console.log(spec ? `Definition of Ready: PASSED (spec: ${spec})` : 'Definition of Ready: PASSED (only exempt paths changed)');
}

if (require.main === module) main();

module.exports = { evaluate, isExempt, isTest, isProduction };
