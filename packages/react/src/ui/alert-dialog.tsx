import type { ComponentProps } from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { Button } from './button';
import { usePortalContainer } from './portal-container';

function AlertDialog({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal
      data-slot="alert-dialog-portal"
      container={usePortalContainer()}
      {...props}
    />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        'bl:fixed bl:inset-0 bl:z-50 bl:bg-black/50 bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: 'default' | 'sm';
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          'bl:group/alert-dialog-content bl:fixed bl:top-[50%] bl:left-[50%] bl:z-50 bl:grid bl:w-full bl:max-w-[calc(100%-2rem)] bl:translate-x-[-50%] bl:translate-y-[-50%] bl:gap-4 bl:rounded-lg bl:border bl:bg-background bl:p-6 bl:shadow-lg bl:duration-200 bl:data-[size=sm]:max-w-xs bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=closed]:zoom-out-95 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0 bl:data-[state=open]:zoom-in-95 bl:data-[size=default]:sm:max-w-lg',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        'bl:grid bl:grid-rows-[auto_1fr] bl:place-items-center bl:gap-1.5 bl:text-center bl:has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] bl:has-data-[slot=alert-dialog-media]:gap-x-6 bl:sm:group-data-[size=default]/alert-dialog-content:place-items-start bl:sm:group-data-[size=default]/alert-dialog-content:text-left bl:sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'bl:flex bl:flex-col-reverse bl:gap-2 bl:group-data-[size=sm]/alert-dialog-content:grid bl:group-data-[size=sm]/alert-dialog-content:grid-cols-2 bl:sm:flex-row bl:sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        'bl:text-lg bl:font-semibold bl:sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('bl:text-sm bl:text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertDialogMedia({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        'bl:mb-2 bl:inline-flex bl:size-16 bl:items-center bl:justify-center bl:rounded-md bl:bg-muted bl:sm:group-data-[size=default]/alert-dialog-content:row-span-2 bl:*:[svg:not([class*=size-])]:size-8',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  );
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
