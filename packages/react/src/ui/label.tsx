import type { ComponentProps } from 'react';
import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'bl:flex bl:items-center bl:gap-2 bl:text-sm bl:leading-none bl:font-medium bl:select-none bl:group-data-[disabled=true]:pointer-events-none bl:group-data-[disabled=true]:opacity-50 bl:peer-disabled:cursor-not-allowed bl:peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
