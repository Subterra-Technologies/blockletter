import { defineBlock, type RenderContext } from '../definition';
import { hostOf } from '../html';
import { SOCIAL_NETWORKS } from '../limits';
import type { FooterBlock, SocialLink } from '../types';
import { blockValidator } from '../validate';
import { present } from './shared';

/** "Facebook", or the bare host for a `website` link. */
const socialLabel = (link: SocialLink, href: string, ctx: RenderContext): string =>
  link.network === 'website' ? hostOf(href) : (ctx.labels[link.network] ?? hostOf(href));

/**
 * Contact details, links and the compliance line, on the ink. Blank contact fields and an empty
 * social list fall back to the brand kit, so one brand kit edit updates every issue that has not
 * overridden them. The preference and unsubscribe links come from the render options, after the
 * compliance text: nothing in that text is matched or rewritten.
 */
export const footerBlock = defineBlock<FooterBlock>({
  type: 'footer',
  label: 'Footer',
  description: 'Contact details, links and the unsubscribe line.',
  group: 'content',
  structural: true,
  create: () => ({
    address: '',
    phone: '',
    email: '',
    social: [],
    links: [],
    complianceText: "You're receiving this email because you signed up for our updates.",
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'footer')
      .string('address')
      .string('phone', { label: 'phone number' })
      .string('email', { label: 'email address' })
      .array('social', { label: 'social links' }, (link) => {
        link
          .oneOf('network', SOCIAL_NETWORKS, { label: 'network' })
          .string('url', { required: 'Add the link.', label: 'link' });
      })
      .array('links', { label: 'links' }, (link) => {
        link.string('label', { label: 'link text' }).string('url', { label: 'link' });
      })
      .string('complianceText', { label: 'compliance text' }).issues,
  summary: (block) => present(block.address, block.email)[0] ?? '',
  render(block, ctx) {
    const { brand, labels, palette } = ctx;
    const address = block.address.trim() || (brand.contact?.address?.trim() ?? '');
    const phone = block.phone.trim() || (brand.contact?.phone?.trim() ?? '');
    const email = block.email.trim() || (brand.contact?.email?.trim() ?? '');
    const social = (block.social.length ? block.social : (brand.social ?? []))
      .filter((link) => link.url?.trim())
      .map((link) => {
        const href = ctx.url(link.url);
        return { label: socialLabel(link, href, ctx), href };
      });
    const links = block.links
      .filter((link) => link.label.trim())
      .map((link) => ({ label: link.label.trim(), href: ctx.url(link.url) }));
    const name = brand.name?.trim() ?? '';
    const compliance = block.complianceText.trim();
    // Per recipient, or an email service's merge tag such as {{{RESEND_UNSUBSCRIBE_URL}}}: these
    // go in exactly as given, escaped for the attribute and never rewritten as a URL.
    const { preferencesUrl, unsubscribeUrl } = ctx.options;
    const optOut = [
      ...(preferencesUrl?.trim()
        ? [{ label: labels.managePreferences, href: preferencesUrl }]
        : []),
      ...(unsubscribeUrl?.trim() ? [{ label: labels.unsubscribe, href: unsubscribeUrl }] : []),
    ];
    if (
      !name &&
      !address &&
      !phone &&
      !email &&
      social.length === 0 &&
      links.length === 0 &&
      !compliance &&
      optOut.length === 0
    ) {
      return '';
    }

    ctx.text(
      ...(name ? [name.toUpperCase()] : []),
      ...(address ? [address] : []),
      ...(phone || email ? [present(phone, email).join(' · ')] : []),
      ...social.map((link) => `${link.label}: ${link.href}`),
      ...links.map((link) => `${link.label}: ${link.href}`),
      ...(compliance ? [block.complianceText] : []),
      ...optOut.map((link) => `${link.label}: ${link.href}`),
      '',
    );

    const linkStyle = `color:${palette.footerText};text-decoration:underline;`;
    const anchor = (href: string, label: string): string =>
      `<a href="${ctx.escape(href)}" style="${linkStyle}">${ctx.escape(label)}</a>`;
    const contact = [
      ...(phone ? [ctx.escape(phone)] : []),
      ...(email
        ? [`<a href="mailto:${ctx.escape(email)}" style="${linkStyle}">${ctx.escape(email)}</a>`]
        : []),
      ...social.map((link) => anchor(link.href, link.label)),
    ];
    const finePrint = [
      compliance ? ctx.escape(block.complianceText) : '',
      optOut.map((link) => anchor(link.href, link.label)).join(' &middot; '),
    ]
      .filter(Boolean)
      .join(' ');
    const small = ctx.smallStyle(palette.footerText);
    return ctx.section(
      block,
      (name
        ? `<p style="margin:0 0 6px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(16)}px;color:${palette.footerText};">${ctx.escape(name)}</p>`
        : '') +
        (address ? `<p style="${small}">${ctx.escape(address)}</p>` : '') +
        (contact.length ? `<p style="${small}">${contact.join(' &middot; ')}</p>` : '') +
        (links.length
          ? `<p style="${small}margin-top:12px;">${links.map((link) => anchor(link.href, link.label)).join(' &middot; ')}</p>`
          : '') +
        (finePrint
          ? `<p style="${small}margin-top:14px;font-size:${ctx.px(12)}px;opacity:0.9;">${finePrint}</p>`
          : ''),
      { background: palette.footer, padding: '24px 32px 28px 32px' },
    );
  },
});
