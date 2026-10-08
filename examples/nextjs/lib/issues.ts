import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NewsletterDocument } from '@subterra-technologies/blockletter';

/**
 * Drafts, kept in one JSON file so the example runs with nothing to set up. A real app keeps them
 * in its own database, behind functions like these: a `NewsletterDocument` is plain JSON, so a
 * JSON column (Postgres `jsonb`, MySQL `JSON`) or a document store holds it as it is.
 *
 * The file is `data/issues.json`, created on the first save. It suits one developer's machine,
 * not a deployment: serverless hosts give each instance its own short-lived disk.
 */

export interface Issue {
  id: string;
  document: NewsletterDocument;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'issues.json');

async function readAll(): Promise<Issue[]> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as Issue[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Saves run one at a time, and each writes a whole new file before renaming it into place, so two
 * saves never interleave and a crash never leaves half a file.
 */
let queue: Promise<unknown> = Promise.resolve();

function change<T>(apply: (issues: Issue[]) => { issues: Issue[]; result: T }): Promise<T> {
  const run = queue.then(async () => {
    const { issues, result } = apply(await readAll());
    await mkdir(DATA_DIR, { recursive: true });
    const temporary = `${FILE}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(issues, null, 2)}\n`);
    await rename(temporary, FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Every draft, the most recently saved first. */
export async function listIssues(): Promise<Issue[]> {
  const issues = await readAll();
  return issues.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getIssue(id: string): Promise<Issue | undefined> {
  const issues = await readAll();
  return issues.find((issue) => issue.id === id);
}

export function insertIssue(document: NewsletterDocument): Promise<Issue> {
  return change((issues) => {
    const issue: Issue = { id: randomUUID(), document, updatedAt: new Date().toISOString() };
    return { issues: [...issues, issue], result: issue };
  });
}

/** The saved issue, or undefined when there is no issue `id`. */
export function updateIssue(id: string, document: NewsletterDocument): Promise<Issue | undefined> {
  return change((issues) => {
    const current = issues.find((issue) => issue.id === id);
    if (!current) return { issues, result: undefined };
    const saved: Issue = { ...current, document, updatedAt: new Date().toISOString() };
    return { issues: issues.map((issue) => (issue.id === id ? saved : issue)), result: saved };
  });
}
