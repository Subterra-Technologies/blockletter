import type { ComponentProps } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { usePortalContainer } from './portal-container';

function Select({ ...props }: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'bl:flex bl:w-fit bl:items-center bl:justify-between bl:gap-2 bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:px-3 bl:py-2 bl:text-sm bl:whitespace-nowrap bl:shadow-xs bl:transition-[color,box-shadow] bl:outline-none bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50 bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:data-[placeholder]:text-muted-foreground bl:data-[size=default]:h-9 bl:data-[size=sm]:h-8 bl:*:data-[slot=select-value]:line-clamp-1 bl:*:data-[slot=select-value]:flex bl:*:data-[slot=select-value]:items-center bl:*:data-[slot=select-value]:gap-2 bl:dark:bg-input/30 bl:dark:hover:bg-input/50 bl:dark:aria-invalid:ring-destructive/40 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4 bl:[&_svg:not([class*=text-])]:text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="bl:size-4 bl:opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal container={usePortalContainer()}>
      <SelectPrimitive.Content
        data-slot="select-content"
        aria-label="Options"
        className={cn(
          'bl:relative bl:z-50 bl:max-h-(--radix-select-content-available-height) bl:min-w-[8rem] bl:origin-(--radix-select-content-transform-origin) bl:overflow-x-hidden bl:overflow-y-auto bl:rounded-md bl:border bl:bg-popover bl:text-popover-foreground bl:shadow-md bl:data-[side=bottom]:slide-in-from-top-2 bl:data-[side=left]:slide-in-from-right-2 bl:data-[side=right]:slide-in-from-left-2 bl:data-[side=top]:slide-in-from-bottom-2 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0 bl:data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'bl:data-[side=bottom]:translate-y-1 bl:data-[side=left]:-translate-x-1 bl:data-[side=right]:translate-x-1 bl:data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'bl:p-1',
            position === 'popper' &&
              'bl:h-[var(--radix-select-trigger-height)] bl:w-full bl:min-w-[var(--radix-select-trigger-width)] bl:scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('bl:px-2 bl:py-1.5 bl:text-xs bl:text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'bl:relative bl:flex bl:w-full bl:cursor-default bl:items-center bl:gap-2 bl:rounded-sm bl:py-1.5 bl:pr-8 bl:pl-2 bl:text-sm bl:outline-hidden bl:select-none bl:focus:bg-accent bl:focus:text-accent-foreground bl:data-[disabled]:pointer-events-none bl:data-[disabled]:opacity-50 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4 bl:[&_svg:not([class*=text-])]:text-muted-foreground bl:*:[span]:last:flex bl:*:[span]:last:items-center bl:*:[span]:last:gap-2',
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="bl:absolute bl:right-2 bl:flex bl:size-3.5 bl:items-center bl:justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="bl:size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('bl:pointer-events-none bl:-mx-1 bl:my-1 bl:h-px bl:bg-border', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'bl:flex bl:cursor-default bl:items-center bl:justify-center bl:py-1',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="bl:size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'bl:flex bl:cursor-default bl:items-center bl:justify-center bl:py-1',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="bl:size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
