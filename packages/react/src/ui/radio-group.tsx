import type { ComponentProps } from 'react';
import { CircleIcon } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';

function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('bl:grid bl:gap-3', className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'bl:aspect-square bl:size-4 bl:shrink-0 bl:rounded-full bl:border bl:border-input bl:text-primary bl:shadow-xs bl:transition-[color,box-shadow] bl:outline-none bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50 bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:dark:bg-input/30 bl:dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="bl:relative bl:flex bl:items-center bl:justify-center"
      >
        <CircleIcon className="bl:absolute bl:top-1/2 bl:left-1/2 bl:size-2 bl:-translate-x-1/2 bl:-translate-y-1/2 bl:fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
