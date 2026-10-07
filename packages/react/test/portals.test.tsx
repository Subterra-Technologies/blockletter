import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BlockletterRoot } from '../src';
import { Button } from '../src/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../src/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../src/ui/dropdown-menu';
import { Label } from '../src/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/ui/tooltip';

/** The container overlays portal into: the last child of the root `element` sits in. */
function portalOf(element: HTMLElement): HTMLElement {
  const container = element
    .closest('.bl-root')
    ?.querySelector<HTMLElement>(':scope > [data-bl-portal]');
  if (!container) throw new Error('Not inside a Blockletter root');
  return container;
}

function TemplateDialog({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button>Save as template</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Save as template</DialogTitle>
        <DialogDescription>Saved templates are offered when an issue starts.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe('overlays inside a BlockletterRoot', () => {
  it('opens a Select’s listbox in the root’s container, not document.body', async () => {
    const user = userEvent.setup();
    render(
      <BlockletterRoot>
        <Label htmlFor="frequency">Frequency</Label>
        <Select defaultValue="weekly">
          <SelectTrigger id="frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </BlockletterRoot>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Frequency' });

    await user.click(trigger);
    const listbox = await screen.findByRole('listbox');
    expect(portalOf(trigger)).toContainElement(listbox);
    expect(listbox.parentElement).not.toBe(document.body);

    await user.click(screen.getByRole('option', { name: 'Monthly' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Monthly');
  });

  it('opens a Dialog and its overlay in the root’s container', async () => {
    const user = userEvent.setup();
    render(
      <BlockletterRoot>
        <TemplateDialog />
      </BlockletterRoot>,
    );
    const trigger = screen.getByRole('button', { name: 'Save as template' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Save as template' });
    const container = portalOf(trigger);
    expect(container).toContainElement(dialog);
    expect(container.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('portals a Dialog that is open from the first render into the root too', () => {
    render(
      <BlockletterRoot>
        <TemplateDialog defaultOpen />
      </BlockletterRoot>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Save as template' });
    expect(dialog.closest('[data-bl-portal]')).not.toBeNull();
  });

  it('opens a DropdownMenu in the root’s container', async () => {
    const user = userEvent.setup();
    render(
      <BlockletterRoot>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Block actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </BlockletterRoot>,
    );
    const trigger = screen.getByRole('button', { name: 'Block actions' });

    await user.click(trigger);
    const menu = await screen.findByRole('menu');
    expect(portalOf(trigger)).toContainElement(menu);
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
  });

  it.each([
    ['under a provider of its own', true],
    ['under the root’s provider', false],
  ])('shows a Tooltip %s in the root’s container on keyboard focus', async (_, ownProvider) => {
    const user = userEvent.setup();
    const moveUp = (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" aria-label="Move up" />
        </TooltipTrigger>
        <TooltipContent>Move up (Alt+Up)</TooltipContent>
      </Tooltip>
    );
    render(
      <BlockletterRoot>
        {ownProvider ? <TooltipProvider delayDuration={300}>{moveUp}</TooltipProvider> : moveUp}
      </BlockletterRoot>,
    );
    const trigger = screen.getByRole('button', { name: 'Move up' });

    await user.tab();
    expect(trigger).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Move up (Alt+Up)');
    expect(portalOf(trigger)).toContainElement(tooltip);
  });

  it('uses the nearest root when roots nest', () => {
    render(
      <BlockletterRoot data-testid="outer">
        <BlockletterRoot data-testid="inner" theme="dark">
          <TemplateDialog defaultOpen />
        </BlockletterRoot>
      </BlockletterRoot>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Save as template' });
    expect(dialog.closest('.bl-root')).toBe(screen.getByTestId('inner'));
  });
});

describe('overlays outside any BlockletterRoot', () => {
  it('fall back to document.body, as Radix does by default', () => {
    render(<TemplateDialog defaultOpen />);
    const dialog = screen.getByRole('dialog', { name: 'Save as template' });
    expect(dialog.closest('.bl-root')).toBeNull();
    expect(document.body).toContainElement(dialog);
  });
});
