import {
  fillTokens,
  newBlockId,
  periodTokens,
  type BrandKit,
  type BuiltInBlock,
  type DataSource,
  type IssuePeriod,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { assetUrl } from './assets';

/**
 * Subterra Technologies, as its own website presents it. Every string here is published copy from
 * subterratechnologies.com (headlines, services, products, posts and their dates, figures), so the
 * demo makes no claim the site does not already make. It names no clients, partners or press.
 *
 * The accent is a darker shade of the logo's blue (#00B5EE): the logo blue is only 2.4:1 on
 * white, too faint for text and button labels, and stays as the highlight on the navy bands.
 */

export const SUBTERRA_SITE_URL = 'https://www.subterratechnologies.com';

export const SUBTERRA_BRAND: BrandKit = {
  name: 'Subterra Technologies',
  logo: { url: assetUrl('demo/subterra/subterra-logo.png') },
  colors: {
    ink: '#04263f',
    accent: '#0078ae',
    highlight: '#00b5ee',
    page: '#f7f5f2',
  },
  fonts: { heading: 'Helvetica', body: 'Arial' },
  contact: {
    address: '7845 Hwy 1, Mansura, LA 71350',
    phone: '(318) 769-0907',
    email: 'info@subterra.one',
    website: SUBTERRA_SITE_URL,
  },
  social: [
    { network: 'linkedin', url: 'https://www.linkedin.com/company/subterra-technologies' },
    { network: 'x', url: 'https://x.com/subterra_ai' },
    { network: 'facebook', url: 'https://www.facebook.com/profile.php?id=61570437205949' },
    { network: 'tiktok', url: 'https://www.tiktok.com/@subterra_ai' },
  ],
};

const POSTS = [
  {
    ref: 'how-subterra-deploys-private-ai-systems',
    kicker: 'Field notes',
    title: 'How Subterra Deploys Private AI Systems',
    excerpt:
      'A proof-led breakdown of how Subterra approaches private AI architecture, deployment boundaries, and governance for sensitive workflows.',
  },
  {
    ref: 'case-study-600-microsites-later',
    kicker: 'Case study',
    title: '600 Microsites Later: What Changed After Replacing PDFs',
    excerpt:
      'A proof-led look at how Microsites turned static document delivery into interactive, trackable web experiences at scale.',
  },
  {
    ref: 'case-study-geoiq-subsurface-intelligence',
    kicker: 'Case study',
    title: 'GeoIQ Deep Dive: From Bore Logs to Searchable Subsurface Intelligence',
    excerpt:
      'How Subterra turned fragmented geotechnical inputs into a clearer, more searchable intelligence workflow through GeoIQ.',
  },
  {
    ref: 'case-study-observability-platform-1500-devices',
    kicker: 'Case study',
    title: 'Observability Platform: Lessons from a 1,500-Device Infrastructure',
    excerpt:
      'What Subterra learned while building an observability platform around anomaly detection, signal interpretation, and faster response.',
  },
].map((post) => ({ ...post, url: `/blog/${post.ref}` }));

/** The visible posts: Subterra's own projects, newest first. */
const FEATURED_POSTS = [POSTS[0], POSTS[1], POSTS[2]].filter(
  (post): post is (typeof POSTS)[number] => Boolean(post),
);

const SERVICES = [
  {
    ref: 'custom-ai-development',
    name: 'Custom AI Development',
    detail: 'AI systems designed around your workflow, data, and operating reality',
  },
  {
    ref: 'workflow-automation',
    name: 'AI Workflow Automation',
    detail: 'Practical automation for repetitive work, routing, and operational follow-through',
  },
  {
    ref: 'agentic-pipelines',
    name: 'AI Agents',
    detail:
      'Hundreds of proactive agents that start work on their own and check in before they act',
  },
  {
    ref: 'private-ai-on-prem-ai',
    name: 'Private AI / On-Prem AI',
    detail:
      'Controlled AI deployments for sensitive data, internal systems, and stricter requirements',
  },
  {
    ref: 'llm-development',
    name: 'LLM Development',
    detail: 'Language-model systems tailored to your domain, content, and workflow',
  },
  {
    ref: 'ai-first-websites',
    name: 'AI-First Websites',
    detail: 'Websites structured to be found in ChatGPT and AI-driven search',
  },
].map((service) => ({ ...service, url: `/services/${service.ref}` }));

/** Earlier posts, with the dates the blog gives them. */
const ARCHIVE = [
  {
    ref: 'building-agentic-pipelines-at-scale',
    date: 'Mar. 10',
    sortDate: '2026-03-10',
    text: 'Building Agentic Pipelines at Scale',
  },
  {
    ref: 'introducing-microsites',
    date: 'Mar. 5',
    sortDate: '2026-03-05',
    text: 'Introducing Microsites: Kill the PDF',
  },
  {
    ref: 'ai-policy-frameworks',
    date: 'Feb. 20',
    sortDate: '2026-02-20',
    text: 'AI Policy Frameworks Every Organization Needs',
  },
];

export const SUBTERRA_SOURCES = [
  {
    id: 'posts',
    label: 'Subterra blog',
    blockType: 'post_list',
    items: () => POSTS,
  } satisfies DataSource<'post_list'>,
  {
    id: 'services',
    label: 'Subterra services',
    blockType: 'name_list',
    limit: 4,
    items: () => SERVICES,
  } satisfies DataSource<'name_list'>,
  {
    id: 'archive',
    label: 'Blog archive',
    blockType: 'dated_list',
    items: () => ARCHIVE,
  } satisfies DataSource<'dated_list'>,
] as const;

const base = <T extends BuiltInBlock['type']>(type: T) => ({
  id: newBlockId(type),
  type,
  hidden: false,
});

/** The issue the demo opens on: a Subterra newsletter built from the website's own content. */
export function subterraStarterIssue(period: IssuePeriod): NewsletterDocument {
  const tokens = periodTokens(period, SUBTERRA_BRAND);
  const blocks: BuiltInBlock[] = [
    {
      ...base('header'),
      title: 'Field Notes',
      issueLabel: fillTokens('{{monthYear}}', tokens),
      logoText: 'Subterra Technologies',
    },
    {
      ...base('banner'),
      alt: '',
      heading: 'Applied AI.',
      subheading:
        'Custom-built AI systems, autonomous pipelines, and hands-on support from a team that answers the phone.',
      ctaLabel: 'Start a project',
      ctaUrl: '/#contact',
      overlay: false,
    },
    {
      ...base('letter'),
      heading: 'Built for the AI era',
      body:
        'Subterra was created around AI from the beginning, not adapted later to keep up with demand. Founded in Louisiana, the company helps businesses adopt AI through training, strategy, workflow design, and custom systems meant to be deployed, not just demoed.\n\n' +
        'Each issue of Field Notes brings AI insights, product updates, and practical guides. No noise.',
      signature: 'The Subterra team',
      photo: { url: assetUrl('demo/subterra/monogram.png') },
    },
    {
      ...base('post_list'),
      source: 'posts',
      heading: 'Research & field notes',
      items: FEATURED_POSTS,
    },
    {
      ...base('text'),
      heading: 'Products',
      body: 'Each one born from patterns we saw across dozens of custom builds.',
    },
    {
      ...base('columns'),
      columns: [
        {
          image: { url: assetUrl('demo/subterra/microsites.jpg') },
          alt: 'Microsites logo',
          heading: 'Microsites',
          body: 'Documents become interactive, trackable web experiences.',
          linkLabel: 'Visit microsites.one',
          linkUrl: 'https://microsites.one',
        },
        {
          image: { url: assetUrl('demo/subterra/lattice.jpg') },
          alt: 'Lattice by Subterra logo',
          heading: 'Lattice',
          body: 'Packet-level AI analytics and anomaly detection for networks that need real visibility.',
          linkLabel: 'Request a walkthrough',
          linkUrl: '/products/networking',
        },
        {
          image: { url: assetUrl('demo/subterra/geoiq.jpg') },
          alt: 'Subterra GeoIQ logo',
          heading: 'GeoIQ',
          body: 'Geo samples, bore data, and geology reports transformed into predictive 3D subsurface intelligence.',
          linkLabel: 'Request product details',
          linkUrl: '/products/geo-iq',
        },
      ],
    },
    {
      ...base('stats'),
      items: [
        { value: '600', label: 'Microsites delivered' },
        { value: '1,500+', label: 'Devices monitored' },
        { value: '10 Gbps', label: 'Lattice packet analysis' },
      ],
    },
    {
      ...base('quote'),
      quote: 'AI-first from day one, built for businesses that need real results.',
      attribution: 'Subterra Technologies',
    },
    {
      ...base('name_list'),
      source: 'services',
      heading: 'What we build',
      intro: 'Systems we design, ship, and run.',
      items: SERVICES.slice(0, 4),
    },
    {
      ...base('dated_list'),
      source: 'archive',
      heading: 'From the archive',
      subheading: 'Earlier field notes',
      items: ARCHIVE,
    },
    {
      ...base('callout'),
      heading: 'Is your site ready for AI search?',
      body: 'AI-first websites are structured to be found in ChatGPT and AI-driven search. Run a readiness scan and see where you stand.',
      ctaLabel: 'Scan my site for AI readiness',
      ctaUrl: '/agent-readiness-check',
    },
    {
      ...base('button'),
      label: 'Book a strategy conversation',
      url: '/#contact',
      variant: 'solid',
    },
    {
      ...base('footer'),
      address: '',
      phone: '',
      email: '',
      social: [],
      links: [
        { label: 'Services', url: '/services' },
        { label: 'Products', url: '/products' },
        { label: 'Blog', url: '/blog' },
        { label: 'Contact', url: '/#contact' },
      ],
      complianceText:
        "You're receiving Field Notes because you subscribed at subterratechnologies.com.",
    },
  ];
  return {
    version: 1,
    subject: fillTokens('Field Notes · {{monthYear}}', tokens),
    preheader: 'Applied AI: new research, case studies, and what we have been building.',
    period,
    blocks,
  };
}
