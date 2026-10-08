import type { BrandKit } from '@subterra-technologies/blockletter';

/**
 * A fictional organisation. The `.example` domain is reserved for documentation (RFC 2606) and
 * 555-01xx numbers for fiction, so nothing here reaches a real inbox or phone.
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

/** Relative links in the issue, such as an event's `/events/…`, resolve against this. */
export const SITE_URL = 'https://fernhill-tools.example';

/**
 * The organisation's own time zone. "This month" and "today" mean the dates there, wherever the
 * script happens to run.
 */
export const TIME_ZONE = 'America/Denver';
