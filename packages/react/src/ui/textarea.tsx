import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'bl:flex bl:field-sizing-content bl:min-h-16 bl:w-full bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:px-3 bl:py-2 bl:text-base bl:shadow-xs bl:transition-[color,box-shadow] bl:outline-none bl:placeholder:text-muted-foreground bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50 bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:md:text-sm bl:dark:bg-input/30 bl:dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
