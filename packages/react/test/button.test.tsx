import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/ui/button';

describe('Button', () => {
  it('is a default-sized primary button unless told otherwise', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveAttribute('data-variant', 'default');
    expect(button).toHaveAttribute('data-size', 'default');
    expect(button).toHaveClass('bl:bg-primary', 'bl:text-primary-foreground', 'bl:h-9');
  });

  it.each([
    ['destructive', ['bl:bg-destructive', 'bl:text-white']],
    ['outline', ['bl:border', 'bl:bg-background', 'bl:shadow-xs']],
    ['secondary', ['bl:bg-secondary', 'bl:text-secondary-foreground']],
    ['ghost', ['bl:hover:bg-accent']],
    ['link', ['bl:text-primary', 'bl:hover:underline']],
  ] as const)('draws the %s variant', (variant, classes) => {
    render(<Button variant={variant}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('data-variant', variant);
    expect(button).toHaveClass(...classes);
    expect(button).not.toHaveClass('bl:bg-primary');
  });

  it.each([
    ['xs', 'bl:h-6'],
    ['sm', 'bl:h-8'],
    ['lg', 'bl:h-10'],
    ['icon', 'bl:size-9'],
    ['icon-xs', 'bl:size-6'],
    ['icon-sm', 'bl:size-8'],
    ['icon-lg', 'bl:size-10'],
  ] as const)('draws the %s size', (size, sizeClass) => {
    render(
      <Button size={size} aria-label="Go">
        {size.startsWith('icon') ? null : 'Go'}
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('data-size', size);
    expect(button).toHaveClass(sizeClass);
    expect(button).not.toHaveClass('bl:h-9');
  });

  it('lets a className override a variant’s own utility', () => {
    render(<Button className="bl:px-8">Wide</Button>);
    const button = screen.getByRole('button', { name: 'Wide' });
    expect(button).toHaveClass('bl:px-8');
    expect(button).not.toHaveClass('bl:px-4');
  });

  it('renders its child instead with asChild, carrying the button styles', () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.org/archive">Past issues</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Past issues' });
    expect(link).toHaveAttribute('href', 'https://example.org/archive');
    expect(link).toHaveAttribute('data-variant', 'outline');
    expect(link).toHaveClass('bl:border', 'bl:inline-flex');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('passes native button behaviour through', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button type="submit" onClick={onClick}>
          Send
        </Button>
        <Button disabled onClick={onClick}>
          Archive
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
