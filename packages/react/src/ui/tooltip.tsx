import type { ComponentProps } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '../lib/cn';
import { usePortalContainer } from './portal-container';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal container={usePortalContainer()}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'bl:z-50 bl:w-fit bl:origin-(--radix-tooltip-content-transform-origin) bl:animate-in bl:rounded-md bl:bg-foreground bl:px-3 bl:py-1.5 bl:text-xs bl:text-balance bl:text-background bl:fade-in-0 bl:zoom-in-95 bl:data-[side=bottom]:slide-in-from-top-2 bl:data-[side=left]:slide-in-from-right-2 bl:data-[side=right]:slide-in-from-left-2 bl:data-[side=top]:slide-in-from-bottom-2 bl:data-[state=closed]:animate-out bl:data-[state=closed]:fade-out-0 bl:data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bl:z-50 bl:size-2.5 bl:translate-y-[calc(-50%_-_2px)] bl:rotate-45 bl:rounded-[2px] bl:bg-foreground bl:fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
