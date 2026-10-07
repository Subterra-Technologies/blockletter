import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * A record's state, in one of five tones. Tone carries meaning, never decoration:
 *
 * - `danger`: something failed or is at risk (failed, bounced, invalid).
 * - `warning`: needs a decision soon (pending review, due today).
 * - `success`: done and healthy (sent, published, active).
 * - `info`: in motion, no action needed (scheduled, in progress).
 * - `neutral`: everything else (draft, archived).
 *
 * The label always says the state in words, so colour is never the only signal.
 */
const statusBadgeVariants = cva(
  'bl:inline-flex bl:w-fit bl:shrink-0 bl:items-center bl:gap-1.5 bl:rounded-md bl:px-1.5 bl:py-0.5 bl:text-xs bl:leading-4 bl:font-medium bl:whitespace-nowrap bl:ring-1 bl:ring-inset',
  {
    variants: {
      tone: {
        neutral: 'bl:bg-muted bl:text-secondary-foreground bl:ring-border',
        success: 'bl:bg-success-soft bl:text-success bl:ring-success/20',
        warning: 'bl:bg-warning-soft bl:text-warning bl:ring-warning/25',
        danger: 'bl:bg-danger-soft bl:text-danger bl:ring-danger/20',
        info: 'bl:bg-info-soft bl:text-info bl:ring-info/20',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>;

const dotTone: Record<StatusTone, string> = {
  neutral: 'bl:bg-muted-foreground/70',
  success: 'bl:bg-success',
  warning: 'bl:bg-warning',
  danger: 'bl:bg-danger',
  info: 'bl:bg-info',
};

export function StatusBadge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn('bl:size-1.5 bl:shrink-0 bl:rounded-full', dotTone[tone ?? 'neutral'])}
        />
      ) : null}
      {children}
    </span>
  );
}

export { statusBadgeVariants };
