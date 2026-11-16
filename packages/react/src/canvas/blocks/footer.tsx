import type { CSSProperties, ReactNode } from 'react';
import { absoluteUrl, type FooterBlock } from '@subterra-technologies/blockletter';

/** "example.org/news" for `https://example.org/news/`, as the email writes the website. */
const displayUrl = (url: string): string =>
  withoutTrailingSlashes(url.replace(/^https?:\/\//i, ''));
import type { BlockCanvasProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockBackground } from '../canvas-theme';
import { CanvasSection, CanvasNote, smallStyle } from './shared';

/** "example.org" for `https://www.example.org/about`, as the email labels a website link. */
function hostOf(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
  return match?.[1]
    ? match[1].replace(/^www\./i, '')
    : withoutTrailingSlashes(url.replace(/^https?:\/\//i, ''));
}

/** `text` without the slashes at its end: a loop, as `/\/+$/` is quadratic on a long run of them. */
function withoutTrailingSlashes(text: string): string {
  let end = text.length;
  while (end > 0 && text.charAt(end - 1) === '/') end -= 1;
  return text.slice(0, end);
}

const UNDERLINE: CSSProperties = { textDecoration: 'underline' };

/** Items joined with the email's middle dots. */
function dotted(items: ReactNode[]): ReactNode[] {
  return items.map((item, index) => (
    <span key={index}>
      {index > 0 ? ' · ' : null}
      {item}
    </span>
  ));
}

/**
 * The organisation's name (from the brand kit), contact details, links and the compliance line, on
 * the ink or (the light look) on the card under a fine line. Blank contact fields, the website, the
 * compliance line and an empty social list fall back to the brand kit, as the email does; the
 * preference and unsubscribe links appear when the render options carry their addresses.
 */
export function FooterCanvas(canvas: BlockCanvasProps<FooterBlock>) {
  const words = useEditorMessages().blocks.footer;
  const { block, brand, palette, fonts, px, labels, options } = canvas;
  const name = brand.name?.trim() ?? '';
  const address = block.address.trim() || (brand.contact?.address?.trim() ?? '');
  const phone = block.phone.trim() || (brand.contact?.phone?.trim() ?? '');
  const email = block.email.trim() || (brand.contact?.email?.trim() ?? '');
  const websiteAddress = block.website?.trim() || (brand.contact?.website?.trim() ?? '');
  const website = websiteAddress ? absoluteUrl(websiteAddress, options.baseUrl) : '';
  const light = block.variant === 'light';
  const social = (block.social.length ? block.social : (brand.social ?? []))
    .filter((link) => link.url?.trim())
    .map((link) => ({ link, href: absoluteUrl(link.url, options.baseUrl) }))
    // The website is already on the contact line.
    .filter(({ href }) => !website || href !== website)
    .map(({ link, href }) =>
      link.network === 'website' ? hostOf(href) : (labels[link.network] ?? hostOf(href)),
    );
  const links = block.links.map((link) => link.label.trim()).filter(Boolean);
  const compliance = block.complianceText.trim() || (brand.complianceText?.trim() ?? '');
  const optOut = [
    ...(options.preferencesUrl?.trim() ? [labels.managePreferences] : []),
    ...(options.unsubscribeUrl?.trim() ? [labels.unsubscribe] : []),
  ];
  const contact: ReactNode[] = [
    ...(phone ? [phone] : []),
    ...(email ? [<span style={UNDERLINE}>{email}</span>] : []),
    ...(website ? [<span style={UNDERLINE}>{displayUrl(website)}</span>] : []),
    ...social.map((label) => <span style={UNDERLINE}>{label}</span>),
  ];
  const textColor = light ? palette.muted : palette.footerText;
  const surface = light ? palette.card : palette.footer;
  const small = smallStyle(canvas, textColor);
  const empty =
    !name &&
    !address &&
    contact.length === 0 &&
    links.length === 0 &&
    !compliance &&
    !optOut.length;

  return (
    <CanvasSection
      canvas={canvas}
      background={surface}
      padding={light ? '8px 32px 28px 32px' : '24px 32px 28px 32px'}
    >
      {light ? (
        <div
          aria-hidden="true"
          style={{ height: '1px', margin: '0 0 22px 0', backgroundColor: palette.border }}
        />
      ) : null}
      {empty ? (
        <CanvasNote canvas={canvas} background={blockBackground(block, surface)}>
          {words.emptyCanvas}
        </CanvasNote>
      ) : null}
      {name ? (
        <p
          style={{
            margin: '0 0 6px 0',
            fontFamily: fonts.heading,
            fontSize: px(16),
            color: light ? palette.heading : palette.footerText,
          }}
        >
          {name}
        </p>
      ) : null}
      {address ? <p style={small}>{address}</p> : null}
      {contact.length ? <p style={small}>{dotted(contact)}</p> : null}
      {links.length ? (
        <p style={{ ...small, marginTop: '12px' }}>
          {dotted(links.map((label) => <span style={UNDERLINE}>{label}</span>))}
        </p>
      ) : null}
      {compliance || optOut.length ? (
        <p style={{ ...small, marginTop: '14px', fontSize: px(12), opacity: 0.9 }}>
          {compliance ? `${compliance}${optOut.length ? ' ' : ''}` : null}
          {dotted(optOut.map((label) => <span style={UNDERLINE}>{label}</span>))}
        </p>
      ) : null}
    </CanvasSection>
  );
}
