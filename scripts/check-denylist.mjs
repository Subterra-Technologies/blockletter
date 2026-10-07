#!/usr/bin/env node
/**
 * Fails when identifying details of the client project Blockletter was extracted from appear
 * anywhere in the repository: the organisation's name, its people, its address and phone, and
 * the local place names its sample copy used. Blockletter ships generic defaults and fictional
 * sample data only.
 *
 * The terms are base64-encoded so this file does not itself advertise them. The state is
 * deliberately not on the list: Subterra, whose own brand the demo uses, is headquartered there.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const self = relative(root, fileURLToPath(import.meta.url));

const decode = (value) => Buffer.from(value, 'base64').toString('utf8');

/** Case-insensitive terms, base64. */
const TERMS = [
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
  'REDACTED',
].map(decode);

/**
 * Case-sensitive, and only in shipped code: the capitalised word was the client's name for
 * itself throughout the UI copy ("Refresh from … data").
 */
const CODE_TERMS = [decode('XGJDaGFtYmVyXGI=')];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.vite',
]);
const SKIP_FILES = new Set(['package-lock.json', self]);
const TEXT = /\.(ts|tsx|js|mjs|cjs|jsx|json|md|mdx|css|scss|html|yml|yaml|txt|svg)$/i;
const CODE_DIRS = ['packages/', 'apps/'];

const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = relative(root, path);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path);
      continue;
    }
    if (SKIP_FILES.has(rel) || !TEXT.test(name)) continue;
    const lines = readFileSync(path, 'utf8').split('\n');
    const inCode = CODE_DIRS.some((prefix) => rel.startsWith(prefix));
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      for (const term of TERMS) {
        if (lower.includes(term.toLowerCase())) findings.push(`${rel}:${index + 1}`);
      }
      if (inCode) {
        for (const pattern of CODE_TERMS) {
          if (new RegExp(pattern).test(line)) findings.push(`${rel}:${index + 1}`);
        }
      }
    });
  }
}

walk(root);

if (findings.length > 0) {
  console.error(
    `Client-identifying text found in ${findings.length} place(s). Blockletter ships generic ` +
      'defaults and fictional sample data only:',
  );
  for (const finding of [...new Set(findings)]) console.error(`  ${finding}`);
  process.exit(1);
}
console.log('Denylist check passed.');
