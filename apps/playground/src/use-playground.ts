import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  createBlock,
  fillBlockTokens,
  insertBlock as insertIntoBlocks,
  isStructural,
  LIMITS,
  periodTokens,
  refreshBlock,
  sourceFor,
  suggestPeriod,
  templateFromDocument,
  todayIn,
  type BrandKit,
  type BuiltInBlockType,
  type IssuePeriod,
  type NewsletterDocument,
  type NewsletterTemplate,
} from '@subterra-technologies/blockletter';
import { DEFAULT_ORGANIZATION_ID, SAMPLE_ORGANIZATIONS, type SampleOrganization } from './sample';
import {
  clearData,
  emptyData,
  loadData,
  newIssueId,
  saveData,
  type PlaygroundData,
  type StoredIssue,
} from './store';

/** The visitor's own time zone: "this month" should mean their month. */
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const findOrganization = (id: string): SampleOrganization =>
  SAMPLE_ORGANIZATIONS.find((organization) => organization.id === id) ??
  (SAMPLE_ORGANIZATIONS[0] as SampleOrganization);

const nowIso = (): string => new Date().toISOString();

async function starterIssue(organization: SampleOrganization): Promise<StoredIssue> {
  const period = suggestPeriod(todayIn(TIME_ZONE));
  const document = await organization.starter(period);
  const at = nowIso();
  return {
    id: newIssueId(),
    organizationId: organization.id,
    document,
    createdAt: at,
    updatedAt: at,
  };
}

/** Data with at least one issue for `organizationId`, creating its starter issue if needed. */
async function withStarter(data: PlaygroundData, organizationId: string): Promise<PlaygroundData> {
  if (data.issues.some((issue) => issue.organizationId === organizationId)) return data;
  const issue = await starterIssue(findOrganization(organizationId));
  return { ...data, issues: [...data.issues, issue] };
}

export interface Playground {
  ready: boolean;
  organization: SampleOrganization;
  brand: BrandKit;
  issues: StoredIssue[];
  issue: StoredIssue | undefined;
  /** Built-in templates plus the ones the visitor saved for this organisation. */
  templates: NewsletterTemplate[];
  savedTemplates: NewsletterTemplate[];
  timeZone: string;
  selectOrganization(id: string): Promise<void>;
  selectIssue(id: string): void;
  updateDocument(document: NewsletterDocument): void;
  /** Adds a fresh block of `type` above the footer; false when the issue can hold no more. */
  addBlock(type: BuiltInBlockType): boolean;
  /** Re-reads every auto-filled block from its source; resolves to how many were refreshed. */
  refreshSourcedBlocks(): Promise<number>;
  createIssue(input: { templateId: string; period: IssuePeriod }): Promise<void>;
  deleteIssue(id: string): void;
  updateBrand(brand: BrandKit): void;
  saveTemplate(input: { name: string; description: string }): void;
  renameTemplate(id: string, name: string): void;
  deleteTemplate(id: string): void;
  reset(): Promise<void>;
}

/**
 * The playground's whole state: which sample organisation is showing, its issues, the visitor's
 * edits to its brand kit and the templates they saved. It plays the part a host's database
 * plays, and is kept in localStorage so a refresh loses nothing.
 */
export function usePlayground(requestedOrganizationId?: string): Playground {
  const [data, setData] = useState<PlaygroundData | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const loading = useRef(false);

  // First visit: build the default organisation's starter issue. Later visits: what was saved.
  useEffect(() => {
    if (loading.current) return;
    loading.current = true;
    const saved = loadData();
    const initial = saved ?? emptyData(DEFAULT_ORGANIZATION_ID);
    // A link naming a sample organisation opens on it; an unknown name is ignored.
    const requested = SAMPLE_ORGANIZATIONS.some((item) => item.id === requestedOrganizationId)
      ? requestedOrganizationId
      : undefined;
    const organizationId = requested ?? initial.organizationId;
    void withStarter({ ...initial, organizationId }, organizationId).then(setData);
  }, [requestedOrganizationId]);

  // Every change is written straight away; there is no Save button in a playground.
  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const organizationId = data?.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const organization = findOrganization(organizationId);
  const brand = data?.brands[organizationId] ?? organization.brand;

  const issues = useMemo(
    () =>
      (data?.issues ?? [])
        .filter((issue) => issue.organizationId === organizationId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [data, organizationId],
  );
  const issue = issues.find((item) => item.id === selectedIssueId) ?? issues[0];

  const savedTemplates = useMemo(
    () => data?.templates[organizationId] ?? [],
    [data, organizationId],
  );
  const templates = useMemo(() => [...BUILT_IN_TEMPLATES, ...savedTemplates], [savedTemplates]);

  const update = useCallback((change: (current: PlaygroundData) => PlaygroundData) => {
    setData((current) => (current ? change(current) : current));
  }, []);

  const selectOrganization = useCallback(
    async (id: string) => {
      if (!data) return;
      const next = await withStarter({ ...data, organizationId: id }, id);
      setSelectedIssueId(null);
      setData(next);
    },
    [data],
  );

  const updateDocument = useCallback(
    (document: NewsletterDocument) => {
      if (!issue) return;
      const id = issue.id;
      update((current) => ({
        ...current,
        issues: current.issues.map((item) =>
          item.id === id ? { ...item, document, updatedAt: nowIso() } : item,
        ),
      }));
    },
    [issue, update],
  );

  const addBlock = useCallback(
    (type: BuiltInBlockType) => {
      if (!issue) return false;
      const { document } = issue;
      if (document.blocks.length >= LIMITS.maxBlocks) return false;
      if (isStructural({ type }) && document.blocks.some((block) => block.type === type)) {
        return false;
      }
      const block = fillBlockTokens(createBlock(type), periodTokens(document.period, brand));
      updateDocument({ ...document, blocks: insertIntoBlocks(document.blocks, block) });
      return true;
    },
    [brand, issue, updateDocument],
  );

  const refreshSourcedBlocks = useCallback(async () => {
    if (!issue) return 0;
    const { document } = issue;
    let refreshed = 0;
    const blocks = await Promise.all(
      document.blocks.map(async (block) => {
        const source = sourceFor(block, organization.sources);
        if (!source) return block;
        refreshed += 1;
        return refreshBlock(block, source, document.period ? { period: document.period } : {});
      }),
    );
    updateDocument({ ...document, blocks });
    return refreshed;
  }, [issue, organization, updateDocument]);

  const createIssue = useCallback(
    async ({ templateId, period }: { templateId: string; period: IssuePeriod }) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) throw new Error('That template is no longer available.');
      const document = await assembleDocument(template, {
        period,
        brand,
        sources: [...organization.sources],
      });
      const at = nowIso();
      const created: StoredIssue = {
        id: newIssueId(),
        organizationId,
        document,
        createdAt: at,
        updatedAt: at,
      };
      update((current) => ({ ...current, issues: [...current.issues, created] }));
      setSelectedIssueId(created.id);
    },
    [brand, organization, organizationId, templates, update],
  );

  const deleteIssue = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        issues: current.issues.filter((item) => item.id !== id),
      }));
      setSelectedIssueId(null);
    },
    [update],
  );

  const updateBrand = useCallback(
    (next: BrandKit) =>
      update((current) => ({
        ...current,
        brands: { ...current.brands, [current.organizationId]: next },
      })),
    [update],
  );

  const saveTemplate = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      if (!issue) return;
      const template = templateFromDocument(issue.document, {
        id: `saved-${newIssueId()}`,
        name,
        description,
      });
      update((current) => ({
        ...current,
        templates: {
          ...current.templates,
          [current.organizationId]: [
            ...(current.templates[current.organizationId] ?? []),
            template,
          ],
        },
      }));
    },
    [issue, update],
  );

  const changeTemplates = useCallback(
    (change: (list: NewsletterTemplate[]) => NewsletterTemplate[]) =>
      update((current) => ({
        ...current,
        templates: {
          ...current.templates,
          [current.organizationId]: change(current.templates[current.organizationId] ?? []),
        },
      })),
    [update],
  );

  const renameTemplate = useCallback(
    (id: string, name: string) =>
      changeTemplates((list) => list.map((item) => (item.id === id ? { ...item, name } : item))),
    [changeTemplates],
  );

  const deleteTemplate = useCallback(
    (id: string) => changeTemplates((list) => list.filter((item) => item.id !== id)),
    [changeTemplates],
  );

  const reset = useCallback(async () => {
    clearData();
    setSelectedIssueId(null);
    setData(await withStarter(emptyData(DEFAULT_ORGANIZATION_ID), DEFAULT_ORGANIZATION_ID));
  }, []);

  return {
    ready: data !== null,
    organization,
    brand,
    issues,
    issue,
    templates,
    savedTemplates,
    timeZone: TIME_ZONE,
    selectOrganization,
    selectIssue: setSelectedIssueId,
    updateDocument,
    addBlock,
    refreshSourcedBlocks,
    createIssue,
    deleteIssue,
    updateBrand,
    saveTemplate,
    renameTemplate,
    deleteTemplate,
    reset,
  };
}
