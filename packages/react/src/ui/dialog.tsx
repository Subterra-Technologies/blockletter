import type { ComponentProps } from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEditorMessages } from '../i18n/context';
import { cn } from '../lib/cn';
import { Button } from './button';
import { usePortalContainer } from './portal-container';

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  const container = usePortalContainer();
  return <DialogPrimitive.Portal data-slot="dialog-portal" container={container} {...props} />;
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'bl:fixed bl:inset-0 bl:z-50 bl:bg-black/50 bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const { common } = useEditorMessages();
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bl:fixed bl:top-[50%] bl:left-[50%] bl:z-50 bl:grid bl:w-full bl:max-w-[calc(100%-2rem)] bl:translate-x-[-50%] bl:translate-y-[-50%] bl:gap-4 bl:rounded-lg bl:border bl:bg-background bl:p-6 bl:shadow-lg bl:duration-200 bl:outline-none bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=closed]:zoom-out-95 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0 bl:data-[state=open]:zoom-in-95 bl:sm:max-w-lg',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="bl:absolute bl:top-4 bl:right-4 bl:rounded-xs bl:opacity-70 bl:ring-offset-background bl:transition-opacity bl:hover:opacity-100 bl:focus:ring-2 bl:focus:ring-ring bl:focus:ring-offset-2 bl:focus:outline-hidden bl:disabled:pointer-events-none bl:data-[state=open]:bg-accent bl:data-[state=open]:text-muted-foreground bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4"
          >
            <XIcon />
            <span className="bl:sr-only">{common.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('bl:flex bl:flex-col bl:gap-2 bl:text-center bl:sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  const { common } = useEditorMessages();
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'bl:flex bl:flex-col-reverse bl:gap-2 bl:sm:flex-row bl:sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{common.close}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('bl:text-lg bl:leading-none bl:font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('bl:text-sm bl:text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
