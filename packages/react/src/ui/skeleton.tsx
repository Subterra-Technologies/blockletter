import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bl:animate-pulse bl:rounded-md bl:bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
