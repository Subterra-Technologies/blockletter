import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import {
  BRAND_FONTS,
  DEFAULT_BRAND,
  contrastRatio,
  fontStack,
  resolvePalette,
  validateBrandKit,
  type BrandFont,
  type BrandKit,
  type ValidationIssue,
} from '@subterra-technologies/blockletter';
import { errorMessage } from '../lib/errors';
import { sameBlock } from '../inspector/editor-base';
import { FieldPair, Note, SelectField, TextField } from '../inspector/editor-fields';
import { ImageField } from '../inspector/image-field';
import { SocialLinksField } from '../inspector/social-links-field';
import { Button } from '../ui/button';
import { FieldError } from '../ui/field';
import { useToasts } from '../ui/toast';
import { BrandColorField } from './brand-color-field';

type ColorKey = keyof BrandKit['colors'];
type ContactKey = keyof BrandKit['contact'];

const COLOR_FIELDS: readonly { key: ColorKey; label: string; hint: string }[] = [
  { key: 'ink', label: 'Ink', hint: 'Text and headings, and the dark bands and footer.' },
  { key: 'accent', label: 'Accent', hint: 'Buttons, small labels and big numbers.' },
  { key: 'highlight', label: 'Highlight', hint: 'The big day numbers on event tiles.' },
  { key: 'page', label: 'Page', hint: 'Behind the email, and the soft section background.' },
];

/** WCAG AA for body text, which every pairing below carries. */
const AA = 4.5;

const FONT_OPTIONS = BRAND_FONTS.map((font) => ({
  value: font,
  // Each choice is shown in its own face, so picking one is picking what it looks like.
  label: <span style={{ fontFamily: fontStack(font) }}>{font}</span>,
}));

/** Where each validation path is shown; anything else is listed under the form. */
const FIELD_PATHS = new Set([
  'name',
  'logo',
  'colors/ink',
  'colors/accent',
  'colors/highlight',
  'colors/page',
  'fonts/heading',
  'fonts/body',
  'contact/address',
  'contact/phone',
  'contact/email',
  'contact/website',
]);
const fieldPath = (issue: ValidationIssue): string => {
  const path = issue.path ?? '';
  if (path.startsWith('logo')) return 'logo';
  if (/^social\/\d+\//.test(path)) return path.replace(/\/[^/]+$/, '/url');
  return path;
};

export interface BrandKitEditorProps {
  /** The saved brand kit. The form edits a copy and follows this while nothing is changed. */
  value: BrandKit;
  /** Saves the edited kit. A rejection is shown in the form, in the error's own words. */
  onSave: (brand: BrandKit) => void | Promise<void>;
  readOnly?: boolean;
  /** The heading's id, for a panel the host labels with it. */
  headingId?: string;
}

/**
 * The brand kit every issue is painted with: the organisation's name and logo, four colours
 * with a contrast warning, two web-safe fonts, and the contact details and social links every
 * footer falls back to. Changing it restyles every issue still being written, so it saves only
 * when asked, and says so.
 *
 * The draft starts from `value` and follows it while nothing is edited here, so a change saved
 * elsewhere shows up without a reload. It is checked with the same rules the core applies to a
 * stored kit; the first problem gets focus, and each one is shown beside its field.
 */
export function BrandKitEditor({
  value,
  onSave,
  readOnly = false,
  headingId,
}: BrandKitEditorProps) {
  const { toast } = useToasts();
  const autoId = useId();
  const [edits, setEdits] = useState<BrandKit | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<'invalid' | 'saved' | null>(null);

  const draft = edits ?? value;
  const dirty = edits !== null && !sameBlock(edits, value);
  const issues = checked ? validateBrandKit(draft) : [];
  const errorAt = (path: string): string | undefined =>
    issues.find((issue) => fieldPath(issue) === path)?.message;
  const elsewhere = issues.filter((issue) => {
    const path = fieldPath(issue);
    return !FIELD_PATHS.has(path) && !/^social\/\d+\/url$/.test(path);
  });

  // After a refused save, the first field that needs another look takes focus. After a save,
  // Save has nothing left to do and is disabled: focus that was on it goes to the heading.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (pending === 'invalid') {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    } else if (pending === 'saved') {
      const active = document.activeElement;
      const lost =
        !active ||
        active === document.body ||
        (active instanceof HTMLButtonElement && active.disabled);
      if (lost) headingRef.current?.focus({ preventScroll: true });
    }
  });

  const palette = resolvePalette(draft);
  const inkContrast = contrastRatio(draft.colors.ink, draft.colors.page);
  const buttonContrast = contrastRatio(draft.colors.accent, palette.accentText);
  // The two pairings that carry text: ink on the page, and a button label on the accent.
  const contrastWarning =
    inkContrast < AA
      ? `Ink on page is ${inkContrast.toFixed(1)}:1, below the 4.5:1 minimum for body text. Pick a darker ink or a lighter page.`
      : buttonContrast < AA
        ? `Button labels on the accent colour are ${buttonContrast.toFixed(1)}:1, below the 4.5:1 minimum. Try a darker or lighter accent.`
        : '';

  function edit(change: Partial<BrandKit>): void {
    setEdits({ ...draft, ...change });
  }

  const setColor = (key: ColorKey, color: string) =>
    edit({ colors: { ...draft.colors, [key]: color } });
  const setFont = (key: keyof BrandKit['fonts'], font: BrandFont) =>
    edit({ fonts: { ...draft.fonts, [key]: font } });
  const setContact = (key: ContactKey, text: string) =>
    edit({ contact: { ...draft.contact, [key]: text } });

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (readOnly || saving) return;
    setChecked(true);
    setError('');
    if (validateBrandKit(draft).length > 0) {
      pendingFocus.current = 'invalid';
      return;
    }
    const saved = draft;
    setSaving(true);
    try {
      await onSave(saved);
      // Anything typed while the save was under way stays a change of its own.
      setEdits((current) => (current && !sameBlock(current, saved) ? current : null));
      setChecked(false);
      pendingFocus.current = 'saved';
      toast('Brand kit saved.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'The brand kit was not saved. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  function discard(): void {
    setEdits(null);
    setChecked(false);
    setError('');
  }

  const contactField = (key: ContactKey, label: string, type?: 'email' | 'url' | 'tel') => (
    <TextField
      label={label}
      type={type}
      value={draft.contact[key]}
      error={errorAt(`contact/${key}`)}
      onChange={(text) => setContact(key, text)}
    />
  );

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => void save(event)}
      className="bl:@container/inspector bl:flex bl:min-w-0 bl:flex-col bl:gap-6"
    >
      <div className="bl:flex bl:flex-col bl:gap-1">
        <h2
          ref={headingRef}
          id={headingId ?? autoId}
          tabIndex={-1}
          className="bl:text-[0.9375rem] bl:font-semibold bl:text-foreground bl:outline-none"
        >
          Brand kit
        </h2>
        <Note>
          Every issue is styled with these. Saving restyles every issue that has not gone out yet.
        </Note>
      </div>

      <fieldset disabled={readOnly} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-6">
        <section aria-labelledby={`${autoId}-org`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-org`} className="bl:text-[0.8125rem] bl:font-semibold">
            Organisation
          </h3>
          <TextField
            label="Organisation name"
            value={draft.name}
            maxLength={120}
            error={errorAt('name')}
            help="The footer’s first line, and the header’s text when there is no logo."
            onChange={(name) => edit({ name })}
          />
          <ImageField
            label="Logo"
            value={draft.logo}
            fit="contain"
            disabled={readOnly}
            error={errorAt('logo')}
            help="Wide logos read best in email."
            onChange={(logo) => {
              const next = { ...draft };
              if (logo) next.logo = logo;
              else delete next.logo;
              setEdits(next);
            }}
          />
        </section>

        <section aria-labelledby={`${autoId}-colors`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-colors`} className="bl:text-[0.8125rem] bl:font-semibold">
            Colours
          </h3>
          {COLOR_FIELDS.map((field) => (
            <BrandColorField
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={draft.colors[field.key]}
              fallback={DEFAULT_BRAND.colors[field.key]}
              error={errorAt(`colors/${field.key}`)}
              onChange={(color) => setColor(field.key, color)}
            />
          ))}
          {contrastWarning ? (
            <p
              role="status"
              className="bl:flex bl:items-start bl:gap-2 bl:rounded-md bl:border bl:border-warning/30 bl:bg-warning-soft bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-warning"
            >
              <TriangleAlertIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
              {contrastWarning}
            </p>
          ) : null}
        </section>

        <section aria-labelledby={`${autoId}-fonts`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-fonts`} className="bl:text-[0.8125rem] bl:font-semibold">
            Fonts
          </h3>
          <FieldPair>
            <SelectField
              label="Heading font"
              value={draft.fonts.heading}
              options={FONT_OPTIONS}
              error={errorAt('fonts/heading')}
              onChange={(font) => setFont('heading', font)}
            />
            <SelectField
              label="Body font"
              value={draft.fonts.body}
              options={FONT_OPTIONS}
              error={errorAt('fonts/body')}
              onChange={(font) => setFont('body', font)}
            />
          </FieldPair>
          <div
            role="img"
            aria-label="Font sample"
            className="bl:flex bl:flex-col bl:gap-1 bl:rounded-md bl:border bl:px-4 bl:py-3"
            style={{ background: palette.page, color: palette.text }}
          >
            <span
              style={{
                fontFamily: fontStack(draft.fonts.heading, 'Georgia'),
                fontSize: '1.25rem',
                lineHeight: 1.25,
              }}
            >
              This month at a glance
            </span>
            <span style={{ fontFamily: fontStack(draft.fonts.body), fontSize: '0.875rem' }}>
              Events, new faces and news, in your own colours and type.
            </span>
          </div>
        </section>

        <section aria-labelledby={`${autoId}-contact`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-contact`} className="bl:text-[0.8125rem] bl:font-semibold">
            Contact
          </h3>
          <Note>Every footer uses these unless an issue gives its own.</Note>
          {contactField('address', 'Address')}
          <FieldPair>
            {contactField('phone', 'Phone', 'tel')}
            {contactField('email', 'Email', 'email')}
          </FieldPair>
          {contactField('website', 'Website', 'url')}
          <SocialLinksField
            links={draft.social}
            onChange={(social) => edit({ social })}
            empty="No social links yet."
            urlErrors={draft.social.map((_, index) => errorAt(`social/${index}/url`))}
          />
        </section>
      </fieldset>

      {elsewhere.length ? (
        <FieldError errors={elsewhere.map((issue) => ({ message: issue.message }))} />
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
      {readOnly ? null : (
        <div className="bl:flex bl:flex-wrap bl:items-center bl:gap-2">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!dirty}
            aria-busy={saving || undefined}
          >
            {saving ? 'Saving…' : 'Save brand kit'}
          </Button>
          {dirty ? (
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={discard}>
              Discard changes
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
