import { Fragment, useRef, useState, type KeyboardEvent } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  RemoveFormattingIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { ActiveFormatting, ListKind, Mark } from './model';

export type FormattingCommand = Mark | ListKind | 'link' | 'clear';

interface Tool {
  command: FormattingCommand;
  label: string;
  Icon: LucideIcon;
  /** The letter of its shortcut, with Control (Command on Apple's systems). */
  key?: string;
  /** Starts a new group, after a divider. */
  group?: true;
}

const TOOLS: readonly Tool[] = [
  { command: 'bold', label: 'Bold', Icon: BoldIcon, key: 'B' },
  { command: 'italic', label: 'Italic', Icon: ItalicIcon, key: 'I' },
  { command: 'link', label: 'Link', Icon: LinkIcon, key: 'K' },
  { command: 'ul', label: 'Bulleted list', Icon: ListIcon, group: true },
  { command: 'ol', label: 'Numbered list', Icon: ListOrderedIcon },
  { command: 'clear', label: 'Clear formatting', Icon: RemoveFormattingIcon, group: true },
];

export interface FormattingToolbarProps {
  /** The field's label, which the toolbar's name starts with: "Text formatting". */
  labelId: string;
  /** The editable text the buttons act on. */
  controls: string;
  formatting: ActiveFormatting;
  /** The link form is open, as `linkFormId`. */
  linkOpen: boolean;
  linkFormId: string;
  commandKey: boolean;
  onCommand: (command: FormattingCommand) => void;
}

/**
 * The rich-text field's buttons, as one toolbar: a single tab stop, with the arrow keys, Home and
 * End moving between its buttons (the ARIA toolbar pattern). Bold, italic and the two lists are
 * toggle buttons whose `aria-pressed` follows the selection; Link opens the link form under it.
 *
 * A press with the pointer leaves the focus in the text (`mousedown` is cancelled), so the
 * selection stays where the formatting goes. From the keyboard, focus stays on the button, which
 * then announces its new state; the selection is put back when the text has focus again.
 */
export function FormattingToolbar({
  labelId,
  controls,
  formatting,
  linkOpen,
  linkFormId,
  commandKey,
  onCommand,
}: FormattingToolbarProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [stop, setStop] = useState(0);
  const nameId = `${controls}-tools`;

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const last = TOOLS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setStop(next);
    buttons.current[next]?.focus();
  }

  const pressed = (command: FormattingCommand): boolean | undefined => {
    if (command === 'bold' || command === 'italic') return formatting[command];
    if (command === 'ul' || command === 'ol') return formatting.list === command;
    return undefined;
  };

  return (
    // Its own provider, with a short delay, so tooltips do not flash while the pointer crosses.
    <TooltipProvider delayDuration={300}>
      <div
        role="toolbar"
        aria-labelledby={`${labelId} ${nameId}`}
        aria-controls={controls}
        className="bl:flex bl:flex-wrap bl:items-center bl:gap-0.5"
      >
        <span id={nameId} hidden>
          formatting
        </span>
        {TOOLS.map((tool, index) => {
          const label = tool.command === 'link' && formatting.link ? 'Edit link' : tool.label;
          const shortcut = tool.key ? `${commandKey ? '⌘' : 'Ctrl+'}${tool.key}` : undefined;
          const link = tool.command === 'link';
          return (
            <Fragment key={tool.command}>
              {tool.group ? (
                <Separator
                  orientation="vertical"
                  className="bl:mx-1 bl:data-[orientation=vertical]:h-5"
                />
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={(node) => {
                      buttons.current[index] = node;
                    }}
                    type="button"
                    aria-label={label}
                    aria-pressed={pressed(tool.command)}
                    aria-keyshortcuts={
                      tool.key ? `${commandKey ? 'Meta' : 'Control'}+${tool.key}` : undefined
                    }
                    aria-expanded={link ? linkOpen : undefined}
                    aria-controls={link && linkOpen ? linkFormId : undefined}
                    tabIndex={index === stop ? 0 : -1}
                    onMouseDown={(event) => event.preventDefault()}
                    onFocus={() => setStop(index)}
                    onKeyDown={(event) => move(event, index)}
                    onClick={() => {
                      setStop(index);
                      onCommand(tool.command);
                    }}
                    className={cn(
                      'bl:inline-flex bl:size-8 bl:items-center bl:justify-center bl:rounded-md bl:text-muted-foreground bl:outline-none bl:transition-colors',
                      'bl:hover:bg-accent bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
                      // A pressed button is filled, not tinted: its state has to read at a glance.
                      'bl:aria-pressed:bg-primary bl:aria-pressed:text-primary-foreground bl:aria-pressed:hover:bg-primary/90',
                      'bl:aria-expanded:bg-accent bl:aria-expanded:text-foreground',
                      'bl:disabled:pointer-events-none bl:disabled:opacity-50',
                      'bl:[&_svg]:size-4 bl:[&_svg]:shrink-0',
                    )}
                  >
                    <tool.Icon aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {shortcut ? `${label} (${shortcut})` : label}
                </TooltipContent>
              </Tooltip>
            </Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
