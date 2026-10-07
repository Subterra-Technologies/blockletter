#!/usr/bin/env node
/**
 * Fails when identifying details of the client project Blockletter was extracted from appear
 * anywhere in the repository. Blockletter ships generic defaults and fictional sample data only.
 *
 * The terms are kept only as salted SHA-256 digests of their lowercase words, so this file names
 * nothing: every word and pair of adjacent words in a file is hashed the same way and compared.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const self = relative(root, fileURLToPath(import.meta.url));

const SALT = 'blockletter-denylist-v1';
const digest = (text) => createHash('sha256').update(`${SALT}:${text}`).digest('hex').slice(0, 24);

/** Digests of single words and two-word phrases. */
const TERM_DIGESTS = new Set([
  '6220a5ab57a9bc706e7a91d7',
  'b88511d1d7a8a8696d5b6ba6',
  '1ec8af2916eca7df27f88183',
  'a7504f43bce05d952057ea8b',
  'b07f7eeec0ec16cf78f2a2e3',
  '6db80507e41b820faeca5d34',
  '1767b3a31af5d87f35d4aa28',
  '6b08799abea96e4830efacd1',
  '7dd08f629f260c412becb81b',
  'ad692e7a5f8b8690deb652dd',
  '926fcc3eeee24a690922f36d',
]);
const MAX_WORDS = 2;

/** Words as the digests were made: lowercase letters and digits, hyphenated runs kept whole. */
const WORDS = /[a-z0-9]+(?:-[a-z0-9]+)*/g;

const lineMatches = (line) => {
  const words = line.toLowerCase().match(WORDS) ?? [];
  for (let start = 0; start < words.length; start += 1) {
    for (let count = 1; count <= MAX_WORDS && start + count <= words.length; count += 1) {
      if (TERM_DIGESTS.has(digest(words.slice(start, start + count).join(' ')))) return true;
    }
  }
  return false;
};

/**
 * Case-sensitive, and only in shipped code: the capitalised word was the client's name for itself
 * throughout the UI copy ("Refresh from … data").
 */
const CODE_TERMS = [/\bChamber\b/];

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
    const inCode = CODE_DIRS.some((prefix) => rel.startsWith(prefix));
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (lineMatches(line) || (inCode && CODE_TERMS.some((term) => term.test(line)))) {
          findings.push(`${rel}:${index + 1}`);
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
