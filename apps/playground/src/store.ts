import type {
  BrandKit,
  NewsletterDocument,
  NewsletterTemplate,
} from '@subterra-technologies/blockletter';

/**
 * Everything the playground keeps, in the visitor's own browser. A real host stores the same
 * three things (documents, templates, brand kits) in its own database; the playground's
 * "database" is one localStorage key, which is why there is a reset.
 */

export interface StoredIssue {
  id: string;
  organizationId: string;
  document: NewsletterDocument;
  createdAt: string;
  updatedAt: string;
}

export interface PlaygroundData {
  version: 1;
  organizationId: string;
  /** Brand kits the visitor edited, by organisation. Absent: the sample's own. */
  brands: Record<string, BrandKit>;
  issues: StoredIssue[];
  /** Templates the visitor saved, by organisation. */
  templates: Record<string, NewsletterTemplate[]>;
}

const STORAGE_KEY = 'blockletter-playground:v1';

export const emptyData = (organizationId: string): PlaygroundData => ({
  version: 1,
  organizationId,
  brands: {},
  issues: [],
  templates: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads the saved data, or `null` when there is none or it is unreadable. Old or hand-edited
 * data is dropped rather than half-trusted: the playground can always rebuild its samples.
 */
export function loadData(): PlaygroundData | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      typeof parsed.organizationId !== 'string' ||
      !isRecord(parsed.brands) ||
      !Array.isArray(parsed.issues) ||
      !isRecord(parsed.templates)
    ) {
      return null;
    }
    return parsed as unknown as PlaygroundData;
  } catch {
    return null;
  }
}

export function saveData(data: PlaygroundData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): the session keeps working, it just won't persist.
  }
}

export function clearData(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

let sequence = 0;
export const newIssueId = (): string =>
  `issue-${Date.now().toString(36)}-${(sequence++).toString(36)}`;
