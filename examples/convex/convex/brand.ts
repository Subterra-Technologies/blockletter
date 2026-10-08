import type { BrandKit, RenderOptions } from '@subterra-technologies/blockletter';

/**
 * A fictional organisation, shared by the Convex functions (assembling and sending) and the
 * client (the editor). The `.example` domain is reserved for documentation (RFC 2606) and
 * 555-01xx numbers for fiction, so nothing here reaches a real inbox or phone. A real app would
 * keep its brand kit in a table and pass `onBrandChange` to the editor to let people edit it.
 */
export const BRAND: BrandKit = {
  name: 'Fernhill Tool Library',
  colors: {
    ink: '#21313c',
    accent: '#2f6f4e',
    highlight: '#e9b949',
    page: '#f3f5f1',
  },
  fonts: { heading: 'Georgia', body: 'Arial' },
  contact: {
    address: '48 Workshop Row, Fernhill',
    phone: '(555) 010-0187',
    email: 'hello@fernhill-tools.example',
    website: 'https://fernhill-tools.example',
  },
  social: [{ network: 'instagram', url: 'https://instagram.example/fernhilltools' }],
};

/**
 * How every render of an issue resolves its links: the editor's preview and the test email alike.
 * One object, so the editor (which asks for a stable one) never sees a new copy.
 */
export const RENDER_OPTIONS: RenderOptions = {
  brand: BRAND,
  baseUrl: 'https://fernhill-tools.example',
};

/** "This month" and "today" mean the dates in the organisation's own time zone. */
export const TIME_ZONE = 'America/Denver';
