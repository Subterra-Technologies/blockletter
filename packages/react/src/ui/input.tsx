import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'bl:h-9 bl:w-full bl:min-w-0 bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:px-3 bl:py-1 bl:text-base bl:shadow-xs bl:transition-[color,box-shadow] bl:outline-none bl:selection:bg-primary bl:selection:text-primary-foreground bl:file:inline-flex bl:file:h-7 bl:file:border-0 bl:file:bg-transparent bl:file:text-sm bl:file:font-medium bl:file:text-foreground bl:placeholder:text-muted-foreground bl:disabled:pointer-events-none bl:disabled:cursor-not-allowed bl:disabled:opacity-50 bl:md:text-sm bl:dark:bg-input/30',
        'bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
        'bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
