import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ImageIcon, Trash2Icon } from 'lucide-react';
import type { ImageRef } from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import { englishMessages, useEditorMessages } from '../i18n/context';
import type { BoundMessages } from '../i18n/resolve';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/errors';
import { Button } from '../ui/button';
import { FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { LiveRegion } from '../ui/live-region';
import { Hint, ImageFileInput, describedBy } from './editor-fields';

/** The image types an upload accepts: what every email client shows. */
export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** The largest image an upload accepts. Email images are downloaded by every reader. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** A size in bytes as megabytes, to a tenth. */
const megabytes = (bytes: number): number => Math.round((bytes / (1024 * 1024)) * 10) / 10;

/** What is wrong with a file picked for an image, or undefined when it may be uploaded. */
export function imageError(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES,
  messages: BoundMessages = englishMessages,
): string | undefined {
  if (!IMAGE_TYPES.includes(file.type)) return messages.images.wrongType;
  if (file.size > maxBytes) return messages.images.tooLarge(megabytes(maxBytes));
  return undefined;
}

/** An absolute https address: the only kind of image link that survives in an inbox. */
export function isHttpsUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

const isWebUrl = (value: string | undefined): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

export interface ImageFieldProps {
  /** The field's name, e.g. "Photo" or "Logo". Default: the messages' "Image". */
  label?: string;
  value: ImageRef | undefined;
  /** The new image, or `undefined` when it was removed. */
  onChange: (value: ImageRef | undefined) => void;
  disabled?: boolean;
  /** Extra help under the field. */
  help?: ReactNode;
  /** A problem with the stored image (from validation), shown under its address. */
  error?: string;
  /** How the thumbnail fills its box: cropped (`cover`, photos) or whole (`contain`, logos). */
  fit?: 'cover' | 'contain';
}

/**
 * An image for a block or the brand kit. When the host can store files (`uploadImage` in the
 * editor context) it offers a file picker, checking the type and size before anything is sent.
 * It always offers an image address too, so a host without storage can still use pictures that
 * live elsewhere. The address commits when the field is left or Enter is pressed, never while it
 * is half typed.
 *
 * An upload can take a while. Its result is applied through the latest `onChange`, so text typed
 * into the block meanwhile is kept rather than replaced by the block as it was when the upload
 * began. A field that has gone by then (another block was chosen) applies nothing: its last
 * `onChange` knows only the issue as it was, and would put back whatever changed since.
 */
export function ImageField({
  label,
  value,
  onChange,
  disabled = false,
  help,
  error,
  fit = 'cover',
}: ImageFieldProps) {
  const { uploadImage } = useEditorContext();
  const m = useEditorMessages();
  const words = m.images;
  const id = useId();
  const labelId = `${id}-label`;
  const fileId = `${id}-file`;
  const urlId = `${id}-url`;
  const uploadHintId = `${id}-upload-help`;
  const uploadErrorId = `${id}-upload-error`;
  const urlErrorId = `${id}-url-error`;
  const brokenId = `${id}-broken`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [status, setStatus] = useState('');
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  // The address box follows the image unless it is being edited. Only a web address is shown:
  // an uploaded image may live at a data: or blob: address nobody should have to read.
  const shownUrl = isWebUrl(value?.url) ? value.url : '';
  const [draft, setDraft] = useState(shownUrl);
  const [seenUrl, setSeenUrl] = useState(shownUrl);
  const [urlError, setUrlError] = useState('');
  if (shownUrl !== seenUrl) {
    setSeenUrl(shownUrl);
    setDraft(shownUrl);
    setUrlError('');
  }

  const latestOnChange = useRef(onChange);
  const mounted = useRef(false);
  useEffect(() => {
    latestOnChange.current = onChange;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const broken = Boolean(value?.url) && brokenUrl === value?.url;

  async function onFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared at once, so choosing the same file again still counts as a choice.
    input.value = '';
    if (!file || !uploadImage) return;
    const problem = imageError(file, MAX_IMAGE_BYTES, m);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError('');
    setUploading(true);
    setStatus(words.uploadingImage);
    try {
      const image = await uploadImage(file);
      if (!mounted.current) return;
      latestOnChange.current(image);
      setStatus(words.uploaded);
    } catch (cause: unknown) {
      if (!mounted.current) return;
      setUploadError(errorMessage(cause, words.uploadFailed));
      setStatus('');
    } finally {
      if (mounted.current) setUploading(false);
    }
  }

  function commitUrl(): void {
    const text = draft.trim();
    if (text === shownUrl) {
      setUrlError('');
      if (draft !== text) setDraft(text);
      return;
    }
    if (!text) {
      setUrlError('');
      onChange(undefined);
      return;
    }
    if (!isHttpsUrl(text)) {
      setUrlError(words.notHttps);
      return;
    }
    setUrlError('');
    onChange({ url: text });
  }

  function onUrlKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    // The field may sit inside a form (the brand kit): Enter applies the address, nothing more.
    if (event.key === 'Enter') {
      event.preventDefault();
      commitUrl();
    }
  }

  function remove(): void {
    setUploadError('');
    setUrlError('');
    setStatus(words.removed);
    onChange(undefined);
  }

  const removeButton =
    value && !disabled ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={remove}
        className="bl:text-muted-foreground bl:hover:text-danger"
      >
        <Trash2Icon aria-hidden="true" />
        {words.remove}
      </Button>
    ) : null;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={help ? helpId : undefined}
      className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2"
    >
      <FieldLabel id={labelId} htmlFor={uploadImage ? fileId : urlId}>
        {label ?? words.label}
      </FieldLabel>
      <div className="bl:flex bl:min-w-0 bl:items-start bl:gap-3">
        {value?.url && !broken ? (
          // Decorative: the field's label already says what the picture is for.
          <img
            className={cn(
              'bl:h-[3.75rem] bl:w-20 bl:shrink-0 bl:rounded-md bl:border bl:bg-background',
              fit === 'contain' ? 'bl:object-contain bl:p-1' : 'bl:object-cover',
            )}
            src={value.url}
            alt=""
            width={80}
            height={60}
            onError={() => setBrokenUrl(value.url)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="bl:flex bl:h-[3.75rem] bl:w-20 bl:shrink-0 bl:flex-col bl:items-center bl:justify-center bl:gap-0.5 bl:rounded-md bl:border bl:border-dashed bl:bg-muted bl:text-xs bl:text-muted-foreground"
          >
            <ImageIcon className="bl:size-4" />
            {broken ? words.cannotLoad : value ? words.saved : words.none}
          </span>
        )}
        <div className="bl:flex bl:min-w-0 bl:flex-1 bl:flex-col bl:gap-3">
          {uploadImage ? (
            <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-1.5">
              <div className="bl:flex bl:flex-wrap bl:items-center bl:gap-1">
                <ImageFileInput
                  id={fileId}
                  label={value ? words.replace : words.choose}
                  accept={IMAGE_TYPES.join(',')}
                  disabled={disabled || uploading}
                  invalid={Boolean(uploadError)}
                  describedBy={describedBy(uploadHintId, uploadError ? uploadErrorId : null)}
                  onChange={(event) => void onFile(event)}
                />
                {removeButton}
              </div>
              <Hint id={uploadHintId}>
                {uploading ? words.uploading : words.uploadHint(megabytes(MAX_IMAGE_BYTES))}
              </Hint>
            </div>
          ) : null}
          <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-1.5">
            <FieldLabel htmlFor={urlId} className="bl:font-normal">
              {words.address}
            </FieldLabel>
            {/* A draft until it commits, so undo while typing it is the browser's. */}
            <Input
              id={urlId}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={m.common.webAddress}
              value={draft}
              data-bl-draft=""
              disabled={disabled}
              aria-invalid={urlError || error ? true : undefined}
              aria-describedby={describedBy(
                urlError ? urlErrorId : null,
                error && !urlError ? errorId : null,
                broken ? brokenId : null,
              )}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitUrl}
              onKeyDown={onUrlKeyDown}
            />
            {urlError ? <FieldError id={urlErrorId}>{urlError}</FieldError> : null}
            {error && !urlError ? <FieldError id={errorId}>{error}</FieldError> : null}
            {broken ? (
              <p id={brokenId} className="bl:text-[0.8125rem] bl:text-warning">
                {words.broken}
              </p>
            ) : null}
          </div>
          {uploadImage ? null : removeButton}
        </div>
      </div>
      {uploadError ? <FieldError id={uploadErrorId}>{uploadError}</FieldError> : null}
      {help ? <Hint id={helpId}>{help}</Hint> : null}
      <LiveRegion>{status}</LiveRegion>
    </div>
  );
}
