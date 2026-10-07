import type { ComponentProps } from 'react';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { usePortalContainer } from './portal-container';

// Non-modal by default. A modal menu marks the rest of the page aria-hidden while it is open
// but leaves it focusable, which axe reports as aria-hidden-focus and page-has-heading-one on
// every page with a row menu. A menu is a transient popup, not a dialog: it still traps
// arrow keys, closes on Escape and outside clicks, and hands focus back to its trigger.
function DropdownMenu({
  modal = false,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" modal={modal} {...props} />;
}

function DropdownMenuPortal({ ...props }: ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal
      data-slot="dropdown-menu-portal"
      container={usePortalContainer()}
      {...props}
    />
  );
}

function DropdownMenuTrigger({ ...props }: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal container={usePortalContainer()}>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'bl:z-50 bl:max-h-(--radix-dropdown-menu-content-available-height) bl:min-w-[8rem] bl:origin-(--radix-dropdown-menu-content-transform-origin) bl:overflow-x-hidden bl:overflow-y-auto bl:rounded-md bl:border bl:bg-popover bl:p-1 bl:text-popover-foreground bl:shadow-md bl:data-[side=bottom]:slide-in-from-top-2 bl:data-[side=left]:slide-in-from-right-2 bl:data-[side=right]:slide-in-from-left-2 bl:data-[side=top]:slide-in-from-bottom-2 bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=closed]:zoom-out-95 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0 bl:data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        'bl:relative bl:flex bl:cursor-default bl:items-center bl:gap-2 bl:rounded-sm bl:px-2 bl:py-1.5 bl:text-sm bl:outline-hidden bl:select-none bl:focus:bg-accent bl:focus:text-accent-foreground bl:data-[disabled]:pointer-events-none bl:data-[disabled]:opacity-50 bl:data-[inset]:pl-8 bl:data-[variant=destructive]:text-destructive bl:data-[variant=destructive]:focus:bg-destructive/10 bl:data-[variant=destructive]:focus:text-destructive bl:dark:data-[variant=destructive]:focus:bg-destructive/20 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4 bl:[&_svg:not([class*=text-])]:text-muted-foreground bl:data-[variant=destructive]:*:[svg]:text-destructive!',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'bl:relative bl:flex bl:cursor-default bl:items-center bl:gap-2 bl:rounded-sm bl:py-1.5 bl:pr-2 bl:pl-8 bl:text-sm bl:outline-hidden bl:select-none bl:focus:bg-accent bl:focus:text-accent-foreground bl:data-[disabled]:pointer-events-none bl:data-[disabled]:opacity-50 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="bl:pointer-events-none bl:absolute bl:left-2 bl:flex bl:size-3.5 bl:items-center bl:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="bl:size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'bl:relative bl:flex bl:cursor-default bl:items-center bl:gap-2 bl:rounded-sm bl:py-1.5 bl:pr-2 bl:pl-8 bl:text-sm bl:outline-hidden bl:select-none bl:focus:bg-accent bl:focus:text-accent-foreground bl:data-[disabled]:pointer-events-none bl:data-[disabled]:opacity-50 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    >
      <span className="bl:pointer-events-none bl:absolute bl:left-2 bl:flex bl:size-3.5 bl:items-center bl:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="bl:size-2 bl:fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn('bl:px-2 bl:py-1.5 bl:text-sm bl:font-medium bl:data-[inset]:pl-8', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bl:-mx-1 bl:my-1 bl:h-px bl:bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('bl:ml-auto bl:text-xs bl:tracking-widest bl:text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'bl:flex bl:cursor-default bl:items-center bl:gap-2 bl:rounded-sm bl:px-2 bl:py-1.5 bl:text-sm bl:outline-hidden bl:select-none bl:focus:bg-accent bl:focus:text-accent-foreground bl:data-[inset]:pl-8 bl:data-[state=open]:bg-accent bl:data-[state=open]:text-accent-foreground bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4 bl:[&_svg:not([class*=text-])]:text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="bl:ml-auto bl:size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'bl:z-50 bl:min-w-[8rem] bl:origin-(--radix-dropdown-menu-content-transform-origin) bl:overflow-hidden bl:rounded-md bl:border bl:bg-popover bl:p-1 bl:text-popover-foreground bl:shadow-lg bl:data-[side=bottom]:slide-in-from-top-2 bl:data-[side=left]:slide-in-from-right-2 bl:data-[side=right]:slide-in-from-left-2 bl:data-[side=top]:slide-in-from-bottom-2 bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=closed]:zoom-out-95 bl:data-[state=open]:animate-in bl:data-[state=open]:fade-in-0 bl:data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
