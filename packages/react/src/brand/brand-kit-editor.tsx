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
import { useEditorMessages } from '../i18n/context';
import { brandKitIssueText } from '../i18n/core-words';
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

/** The brand colours, in the order the form asks for them. */
const COLOR_FIELDS: readonly ColorKey[] = ['ink', 'accent', 'highlight', 'page'];

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
  const m = useEditorMessages();
  const words = m.brandKit;
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
  const errorAt = (path: string): string | undefined => {
    const issue = issues.find((candidate) => fieldPath(candidate) === path);
    return issue && brandKitIssueText(issue, m);
  };
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
      ? words.inkContrast(inkContrast, AA)
      : buttonContrast < AA
        ? words.buttonContrast(buttonContrast, AA)
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
      toast(m.toasts.brandKitSaved);
    } catch (cause: unknown) {
      setError(errorMessage(cause, words.saveFailed));
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
    // A draft until it is saved, and no part of the document: undo while typing here is the
    // browser's, not the editor's.
    <form
      ref={formRef}
      noValidate
      data-bl-draft=""
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
          {words.heading}
        </h2>
        <Note>{words.note}</Note>
      </div>

      <fieldset disabled={readOnly} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-6">
        <section aria-labelledby={`${autoId}-org`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-org`} className="bl:text-[0.8125rem] bl:font-semibold">
            {words.organisation}
          </h3>
          <TextField
            label={words.name}
            value={draft.name}
            maxLength={120}
            error={errorAt('name')}
            help={words.nameHelp}
            onChange={(name) => edit({ name })}
          />
          <ImageField
            label={words.logo}
            value={draft.logo}
            fit="contain"
            disabled={readOnly}
            error={errorAt('logo')}
            help={words.logoHelp}
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
            {words.colors}
          </h3>
          {COLOR_FIELDS.map((key) => (
            <BrandColorField
              key={key}
              label={words.colorFields[key].label}
              hint={words.colorFields[key].hint}
              value={draft.colors[key]}
              fallback={DEFAULT_BRAND.colors[key]}
              error={errorAt(`colors/${key}`)}
              onChange={(color) => setColor(key, color)}
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
            {words.fonts}
          </h3>
          <FieldPair>
            <SelectField
              label={words.headingFont}
              value={draft.fonts.heading}
              options={FONT_OPTIONS}
              error={errorAt('fonts/heading')}
              onChange={(font) => setFont('heading', font)}
            />
            <SelectField
              label={words.bodyFont}
              value={draft.fonts.body}
              options={FONT_OPTIONS}
              error={errorAt('fonts/body')}
              onChange={(font) => setFont('body', font)}
            />
          </FieldPair>
          <div
            role="img"
            aria-label={words.fontSample}
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
              {words.sampleHeading}
            </span>
            <span style={{ fontFamily: fontStack(draft.fonts.body), fontSize: '0.875rem' }}>
              {words.sampleBody}
            </span>
          </div>
        </section>

        <section aria-labelledby={`${autoId}-contact`} className="bl:flex bl:flex-col bl:gap-4">
          <h3 id={`${autoId}-contact`} className="bl:text-[0.8125rem] bl:font-semibold">
            {words.contact}
          </h3>
          <Note>{words.contactNote}</Note>
          {contactField('address', words.address)}
          <FieldPair>
            {contactField('phone', words.phone, 'tel')}
            {contactField('email', words.email, 'email')}
          </FieldPair>
          {contactField('website', words.website, 'url')}
          <SocialLinksField
            links={draft.social}
            onChange={(social) => edit({ social })}
            empty={m.socialLinks.none}
            urlErrors={draft.social.map((_, index) => errorAt(`social/${index}/url`))}
          />
        </section>
      </fieldset>

      {elsewhere.length ? (
        <FieldError errors={elsewhere.map((issue) => ({ message: brandKitIssueText(issue, m) }))} />
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
            {saving ? m.common.saving : words.save}
          </Button>
          {dirty ? (
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={discard}>
              {words.discard}
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
