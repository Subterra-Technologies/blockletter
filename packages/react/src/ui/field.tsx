import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Label } from './label';
import { Separator } from './separator';

function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'bl:flex bl:flex-col bl:gap-6',
        'bl:has-[>[data-slot=checkbox-group]]:gap-3 bl:has-[>[data-slot=radio-group]]:gap-3',
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'bl:mb-3 bl:font-medium',
        'bl:data-[variant=legend]:text-base',
        'bl:data-[variant=label]:text-sm',
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'bl:group/field-group bl:@container/field-group bl:flex bl:w-full bl:flex-col bl:gap-7 bl:data-[slot=checkbox-group]:gap-3 bl:[&>[data-slot=field-group]]:gap-4',
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  'bl:group/field bl:flex bl:w-full bl:gap-3 bl:data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: ['bl:flex-col bl:[&>*]:w-full bl:[&>.sr-only]:w-auto'],
        horizontal: [
          'bl:flex-row bl:items-center',
          'bl:[&>[data-slot=field-label]]:flex-auto',
          'bl:has-[>[data-slot=field-content]]:items-start bl:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
        responsive: [
          'bl:flex-col bl:@md/field-group:flex-row bl:@md/field-group:items-center bl:[&>*]:w-full bl:@md/field-group:[&>*]:w-auto bl:[&>.sr-only]:w-auto',
          'bl:@md/field-group:[&>[data-slot=field-label]]:flex-auto',
          'bl:@md/field-group:has-[>[data-slot=field-content]]:items-start bl:@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

function Field({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    // No role="group": a single label and control is not a group, and an unnamed group
    // only adds noise for a screen reader. FieldSet is the grouping element.
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        'bl:group/field-content bl:flex bl:flex-1 bl:flex-col bl:gap-1.5 bl:leading-snug',
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'bl:group/field-label bl:peer/field-label bl:flex bl:w-fit bl:gap-2 bl:leading-snug bl:group-data-[disabled=true]/field:opacity-50',
        'bl:has-[>[data-slot=field]]:w-full bl:has-[>[data-slot=field]]:flex-col bl:has-[>[data-slot=field]]:rounded-md bl:has-[>[data-slot=field]]:border bl:[&>*]:data-[slot=field]:p-4',
        'bl:has-data-[state=checked]:border-primary bl:has-data-[state=checked]:bg-primary/5 bl:dark:has-data-[state=checked]:bg-primary/10',
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'bl:flex bl:w-fit bl:items-center bl:gap-2 bl:text-sm bl:leading-snug bl:font-medium bl:group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'bl:text-sm bl:leading-normal bl:font-normal bl:text-muted-foreground bl:group-has-[[data-orientation=horizontal]]/field:text-balance',
        'bl:last:mt-0 bl:nth-last-2:-mt-1 bl:[[data-variant=legend]+&]:-mt-1.5',
        'bl:[&>a]:underline bl:[&>a]:underline-offset-4 bl:[&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: ComponentProps<'div'> & {
  children?: ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'bl:relative bl:-my-2 bl:h-5 bl:text-sm bl:group-data-[variant=outline]/field-group:-mb-2',
        className,
      )}
      {...props}
    >
      <Separator className="bl:absolute bl:inset-0 bl:top-1/2" />
      {children && (
        <span
          className="bl:relative bl:mx-auto bl:block bl:w-fit bl:bg-background bl:px-2 bl:text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: ComponentProps<'div'> & {
  errors?: ({ message?: string } | undefined)[];
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors.length === 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="bl:ml-4 bl:flex bl:list-disc bl:flex-col bl:gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('bl:text-sm bl:font-normal bl:text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
