import type { ComponentProps } from 'react';
import { CheckIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'bl:peer bl:size-4 bl:shrink-0 bl:rounded-[4px] bl:border bl:border-input bl:shadow-xs bl:transition-shadow bl:outline-none bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50 bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:data-[state=checked]:border-primary bl:data-[state=checked]:bg-primary bl:data-[state=checked]:text-primary-foreground bl:dark:bg-input/30 bl:dark:aria-invalid:ring-destructive/40 bl:dark:data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="bl:grid bl:place-content-center bl:text-current bl:transition-none"
      >
        <CheckIcon className="bl:size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
