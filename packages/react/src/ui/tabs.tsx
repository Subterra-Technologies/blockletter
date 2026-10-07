import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'bl:group/tabs bl:flex bl:gap-2 bl:data-[orientation=horizontal]:flex-col',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'bl:group/tabs-list bl:inline-flex bl:w-fit bl:items-center bl:justify-center bl:rounded-lg bl:p-[3px] bl:text-muted-foreground bl:group-data-[orientation=horizontal]/tabs:h-9 bl:group-data-[orientation=vertical]/tabs:h-fit bl:group-data-[orientation=vertical]/tabs:flex-col bl:data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bl:bg-muted',
        line: 'bl:gap-1 bl:bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'bl:relative bl:inline-flex bl:h-[calc(100%-1px)] bl:flex-1 bl:items-center bl:justify-center bl:gap-1.5 bl:rounded-md bl:border bl:border-transparent bl:px-2 bl:py-1 bl:text-sm bl:font-medium bl:whitespace-nowrap bl:text-foreground/60 bl:transition-all bl:group-data-[orientation=vertical]/tabs:w-full bl:group-data-[orientation=vertical]/tabs:justify-start bl:hover:text-foreground bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:focus-visible:outline-1 bl:focus-visible:outline-ring bl:disabled:pointer-events-none bl:disabled:opacity-50 bl:group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm bl:group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none bl:dark:text-muted-foreground bl:dark:hover:text-foreground bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4',
        'bl:group-data-[variant=line]/tabs-list:bg-transparent bl:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent bl:dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent bl:dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
        'bl:data-[state=active]:bg-background bl:data-[state=active]:text-foreground bl:dark:data-[state=active]:border-input bl:dark:data-[state=active]:bg-input/30 bl:dark:data-[state=active]:text-foreground',
        'bl:after:absolute bl:after:bg-foreground bl:after:opacity-0 bl:after:transition-opacity bl:group-data-[orientation=horizontal]/tabs:after:inset-x-0 bl:group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] bl:group-data-[orientation=horizontal]/tabs:after:h-0.5 bl:group-data-[orientation=vertical]/tabs:after:inset-y-0 bl:group-data-[orientation=vertical]/tabs:after:-right-1 bl:group-data-[orientation=vertical]/tabs:after:w-0.5 bl:group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('bl:flex-1 bl:outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
