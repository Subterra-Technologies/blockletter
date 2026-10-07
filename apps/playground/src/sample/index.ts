import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  type BrandKit,
  type DataSource,
  type IssuePeriod,
  type NewsletterDocument,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import { MAKERS_GUILD_BRAND, MAKERS_GUILD_SITE_URL, MAKERS_GUILD_SOURCES } from './makers-guild';
import {
  SUBTERRA_BRAND,
  SUBTERRA_SITE_URL,
  SUBTERRA_SOURCES,
  subterraStarterIssue,
} from './subterra';

export interface SampleOrganization {
  id: string;
  /** Shown in the organisation switcher. */
  label: string;
  /** Said out loud in the UI, so nobody mistakes sample data for a real organisation. */
  fictional: boolean;
  brand: BrandKit;
  sources: readonly DataSource[];
  /** What the email's relative links resolve against, and where the footer links point. */
  renderOptions: Pick<RenderOptions, 'baseUrl' | 'poweredBy' | 'unsubscribeUrl' | 'preferencesUrl'>;
  /** The issue the playground opens on the first visit. */
  starter(period: IssuePeriod): Promise<NewsletterDocument>;
}

/** The credit under every demo issue, linking back to the demo itself. */
const POWERED_BY = {
  label: 'Blockletter',
  url: 'https://subterra-technologies.github.io/blockletter/',
};

/** A provider merge tag, inserted verbatim: real sends swap in each recipient's own link. */
const UNSUBSCRIBE_MERGE_TAG = '{{unsubscribe_url}}';

export const SAMPLE_ORGANIZATIONS: readonly SampleOrganization[] = [
  {
    id: 'subterra',
    label: 'Subterra Technologies',
    fictional: false,
    brand: SUBTERRA_BRAND,
    sources: SUBTERRA_SOURCES,
    renderOptions: {
      baseUrl: SUBTERRA_SITE_URL,
      poweredBy: POWERED_BY,
      unsubscribeUrl: UNSUBSCRIBE_MERGE_TAG,
    },
    starter: async (period) => subterraStarterIssue(period),
  },
  {
    id: 'makers-guild',
    label: 'Makers Guild (fictional)',
    fictional: true,
    brand: MAKERS_GUILD_BRAND,
    sources: MAKERS_GUILD_SOURCES,
    renderOptions: {
      baseUrl: MAKERS_GUILD_SITE_URL,
      poweredBy: POWERED_BY,
      unsubscribeUrl: UNSUBSCRIBE_MERGE_TAG,
    },
    starter: async (period) => {
      const template = BUILT_IN_TEMPLATES.find((item) => item.id === 'monthly-newsletter');
      if (!template) throw new Error('The monthly newsletter template is missing.');
      const document = await assembleDocument(template, {
        period,
        brand: MAKERS_GUILD_BRAND,
        sources: [...MAKERS_GUILD_SOURCES],
      });
      // The template cannot know where an organisation takes news; the guild takes it by email.
      return {
        ...document,
        blocks: document.blocks.map((block) =>
          block.type === 'callout' && !block.ctaUrl
            ? { ...block, ctaUrl: `mailto:${MAKERS_GUILD_BRAND.contact.email}` }
            : block,
        ),
      };
    },
  },
];

export const DEFAULT_ORGANIZATION_ID = 'subterra';
