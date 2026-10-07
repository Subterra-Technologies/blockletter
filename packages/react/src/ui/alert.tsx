import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const alertVariants = cva(
  'bl:relative bl:grid bl:w-full bl:grid-cols-[0_1fr] bl:items-start bl:gap-y-0.5 bl:rounded-lg bl:border bl:px-4 bl:py-3 bl:text-sm bl:has-[>svg]:grid-cols-[calc(var(--bl-spacing)*4)_1fr] bl:has-[>svg]:gap-x-3 bl:[&>svg]:size-4 bl:[&>svg]:translate-y-0.5 bl:[&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bl:bg-card bl:text-card-foreground',
        destructive:
          'bl:bg-card bl:text-destructive bl:*:data-[slot=alert-description]:text-destructive/90 bl:[&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'bl:col-start-2 bl:line-clamp-1 bl:min-h-4 bl:font-medium bl:tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'bl:col-start-2 bl:grid bl:justify-items-start bl:gap-1 bl:text-sm bl:text-muted-foreground bl:[&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
