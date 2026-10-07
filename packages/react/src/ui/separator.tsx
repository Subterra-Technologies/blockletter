import type { ComponentProps } from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bl:shrink-0 bl:bg-border bl:data-[orientation=horizontal]:h-px bl:data-[orientation=horizontal]:w-full bl:data-[orientation=vertical]:h-full bl:data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
