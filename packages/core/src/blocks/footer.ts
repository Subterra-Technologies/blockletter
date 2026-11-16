import { defineBlock, type RenderContext } from '../definition';
import { displayUrl, hostOf } from '../html';
import { FOOTER_VARIANTS, SOCIAL_NETWORKS } from '../limits';
import type { FooterBlock, SocialLink } from '../types';
import { blockValidator } from '../validate';
import { present } from './shared';

/** "Facebook", or the bare host for a `website` link. */
const socialLabel = (link: SocialLink, href: string, ctx: RenderContext): string =>
  link.network === 'website' ? hostOf(href) : (ctx.labels[link.network] ?? hostOf(href));

/**
 * Contact details, links and the compliance line, on a band of the ink or (`variant: 'light'`) on
 * the card under a fine line. Blank contact fields, the website, the compliance line and an empty
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
    // Blank, so the brand kit's line applies: what readers signed up for is the host's to say.
    complianceText: '',
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'footer')
      .string('address')
      .string('phone', { label: 'phone number' })
      .string('email', { label: 'email address' })
      .string('website', { optional: true })
      .array('social', { label: 'social links' }, (link) => {
        link
          .oneOf('network', SOCIAL_NETWORKS, { label: 'network' })
          .string('url', { required: 'Add the link.', label: 'link' });
      })
      .array('links', { label: 'links' }, (link) => {
        link.string('label', { label: 'link text' }).string('url', { label: 'link' });
      })
      .string('complianceText', { label: 'compliance text' })
      .oneOf('variant', FOOTER_VARIANTS, { optional: true, label: 'look' }).issues,
  summary: (block) => present(block.address, block.email)[0] ?? '',
  render(block, ctx) {
    const { brand, labels, palette } = ctx;
    const address = block.address.trim() || (brand.contact?.address?.trim() ?? '');
    const phone = block.phone.trim() || (brand.contact?.phone?.trim() ?? '');
    const email = block.email.trim() || (brand.contact?.email?.trim() ?? '');
    const websiteAddress = block.website?.trim() || (brand.contact?.website?.trim() ?? '');
    const website = websiteAddress ? ctx.url(websiteAddress) : '';
    const light = block.variant === 'light';
    const social = (block.social.length ? block.social : (brand.social ?? []))
      .filter((link) => link.url?.trim())
      .map((link) => {
        const href = ctx.url(link.url);
        return { label: socialLabel(link, href, ctx), href };
      })
      // The website is already on the contact line.
      .filter((link) => !website || link.href !== website);
    const links = block.links
      .filter((link) => link.label.trim())
      .map((link) => ({ label: link.label.trim(), href: ctx.url(link.url) }));
    const name = brand.name?.trim() ?? '';
    const compliance = block.complianceText.trim() || (brand.complianceText?.trim() ?? '');
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
      !website &&
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
      ...(website ? [website] : []),
      ...social.map((link) => `${link.label}: ${link.href}`),
      ...links.map((link) => `${link.label}: ${link.href}`),
      ...(compliance ? [compliance] : []),
      ...optOut.map((link) => `${link.label}: ${link.href}`),
      '',
    );

    // The band's text, or on the card the quieter muted colour (a block text colour sets both).
    const textColor = light ? palette.muted : palette.footerText;
    const linkStyle = `color:${textColor};text-decoration:underline;`;
    const anchor = (href: string, label: string): string =>
      `<a href="${ctx.escape(href)}" style="${linkStyle}">${ctx.escape(label)}</a>`;
    const contact = [
      ...(phone ? [ctx.escape(phone)] : []),
      ...(email
        ? [`<a href="mailto:${ctx.escape(email)}" style="${linkStyle}">${ctx.escape(email)}</a>`]
        : []),
      ...(website ? [anchor(website, displayUrl(website))] : []),
      ...social.map((link) => anchor(link.href, link.label)),
    ];
    const finePrint = [
      compliance ? ctx.escape(compliance) : '',
      optOut.map((link) => anchor(link.href, link.label)).join(' &middot; '),
    ]
      .filter(Boolean)
      .join(' ');
    const small = ctx.smallStyle(textColor);
    // On the card, a fine line across the content column says where the email ends.
    const rule = light
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0 0 22px 0;"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background:${palette.border};">&nbsp;</td></tr></table>`
      : '';
    return ctx.section(
      block,
      rule +
        (name
          ? `<p style="margin:0 0 6px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(16)}px;color:${light ? palette.heading : palette.footerText};">${ctx.escape(name)}</p>`
          : '') +
        (address ? `<p style="${small}">${ctx.escape(address)}</p>` : '') +
        (contact.length ? `<p style="${small}">${contact.join(' &middot; ')}</p>` : '') +
        (links.length
          ? `<p style="${small}margin-top:12px;">${links.map((link) => anchor(link.href, link.label)).join(' &middot; ')}</p>`
          : '') +
        (finePrint
          ? `<p style="${small}margin-top:14px;font-size:${ctx.px(12)}px;opacity:0.9;">${finePrint}</p>`
          : ''),
      light
        ? { background: palette.card, padding: '8px 32px 28px 32px' }
        : { background: palette.footer, padding: '24px 32px 28px 32px' },
    );
  },
});
