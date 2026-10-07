import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'bl:inline-flex bl:shrink-0 bl:items-center bl:justify-center bl:gap-2 bl:rounded-md bl:text-sm bl:font-medium bl:whitespace-nowrap bl:transition-all bl:outline-none bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:pointer-events-none bl:disabled:opacity-50 bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:dark:aria-invalid:ring-destructive/40 bl:[&_svg]:pointer-events-none bl:[&_svg]:shrink-0 bl:[&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bl:bg-primary bl:text-primary-foreground bl:hover:bg-primary/90',
        destructive:
          'bl:bg-destructive bl:text-white bl:hover:bg-danger bl:focus-visible:ring-destructive/20 bl:dark:bg-destructive/60 bl:dark:focus-visible:ring-destructive/40',
        outline:
          'bl:border bl:bg-background bl:shadow-xs bl:hover:bg-accent bl:hover:text-accent-foreground bl:dark:border-input bl:dark:bg-input/30 bl:dark:hover:bg-input/50',
        secondary: 'bl:bg-secondary bl:text-secondary-foreground bl:hover:bg-secondary/80',
        ghost: 'bl:hover:bg-accent bl:hover:text-accent-foreground bl:dark:hover:bg-accent/50',
        link: 'bl:text-primary bl:underline-offset-4 bl:hover:underline',
      },
      size: {
        default: 'bl:h-9 bl:px-4 bl:py-2 bl:has-[>svg]:px-3',
        xs: 'bl:h-6 bl:gap-1 bl:rounded-md bl:px-2 bl:text-xs bl:has-[>svg]:px-1.5 bl:[&_svg:not([class*=size-])]:size-3',
        sm: 'bl:h-8 bl:gap-1.5 bl:rounded-md bl:px-3 bl:has-[>svg]:px-2.5',
        lg: 'bl:h-10 bl:rounded-md bl:px-6 bl:has-[>svg]:px-4',
        icon: 'bl:size-9',
        'icon-xs': 'bl:size-6 bl:rounded-md bl:[&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'bl:size-8',
        'icon-lg': 'bl:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
