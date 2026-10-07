import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '../src/ui/alert';
import { Checkbox } from '../src/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../src/ui/field';
import { Input } from '../src/ui/input';
import { Label } from '../src/ui/label';
import { LiveRegion } from '../src/ui/live-region';
import { RadioGroup, RadioGroupItem } from '../src/ui/radio-group';
import { Separator } from '../src/ui/separator';
import { StatusBadge } from '../src/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/ui/tabs';
import { Textarea } from '../src/ui/textarea';

describe('Field', () => {
  it('names and describes its control, and reports its error as an alert', () => {
    render(
      <Field data-invalid="true">
        <FieldLabel htmlFor="subject">Subject</FieldLabel>
        <Input id="subject" aria-describedby="subject-help subject-error" aria-invalid />
        <FieldDescription id="subject-help">Shown in the inbox.</FieldDescription>
        <FieldError id="subject-error">Add a subject.</FieldError>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Subject' });
    expect(input).toHaveAccessibleDescription('Shown in the inbox. Add a subject.');
    expect(screen.getByRole('alert')).toHaveTextContent('Add a subject.');
    // One label and one control are not a group.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('shows one error once, several as a list, and nothing without any', () => {
    const { rerender } = render(
      <FieldError errors={[{ message: 'Required.' }, { message: 'Required.' }]} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/^Required\.$/);

    rerender(<FieldError errors={[{ message: 'Required.' }, { message: 'Too long.' }]} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Required.',
      'Too long.',
    ]);

    rerender(<FieldError errors={[]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('groups radios under a fieldset legend, moving the choice with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <FieldSet>
        <FieldLegend variant="label">Padding</FieldLegend>
        <RadioGroup defaultValue="tight">
          <Field orientation="horizontal">
            <RadioGroupItem value="tight" id="padding-tight" />
            <FieldLabel htmlFor="padding-tight">Tight</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="loose" id="padding-loose" />
            <FieldLabel htmlFor="padding-loose">Loose</FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>,
    );
    expect(screen.getByRole('group', { name: 'Padding' })).toBeInTheDocument();
    const tight = screen.getByRole('radio', { name: 'Tight' });
    expect(tight).toBeChecked();

    // Radix moves focus a tick after the keydown and checks the radio only if the arrow is still
    // held then, as a person's would be; user-event releases keys at once unless told to hold.
    await user.click(tight);
    await user.keyboard('{ArrowDown>}');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Loose' })).toBeChecked());
    await user.keyboard('{/ArrowDown}');
    expect(tight).not.toBeChecked();
  });
});

describe('form controls', () => {
  it('toggles a labelled Checkbox', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Checkbox id="divider" />
        <Label htmlFor="divider">Rule under the block</Label>
      </>,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Rule under the block' });
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText('Rule under the block'));
    expect(checkbox).toBeChecked();
  });

  it('labels a Textarea through its Label', () => {
    render(
      <>
        <Label htmlFor="intro">Introduction</Label>
        <Textarea id="intro" defaultValue="Hello" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Hello');
  });
});

describe('Tabs', () => {
  it('shows the chosen tab’s panel and moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="blocks">
        <TabsList aria-label="Editor panels">
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks">Block palette</TabsContent>
        <TabsContent value="appearance">Colours and fonts</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Block palette');

    await user.click(screen.getByRole('tab', { name: 'Blocks' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Colours and fonts');
  });
});

describe('status and announcements', () => {
  it('says a StatusBadge’s state in words, with its dot hidden from assistive technology', () => {
    render(
      <StatusBadge tone="success" dot>
        Sent
      </StatusBadge>,
    );
    const badge = screen.getByText('Sent');
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(badge).toHaveClass('bl:bg-success-soft', 'bl:text-success');
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveClass('bl:bg-success');
  });

  it('reads an Alert’s title and description as one alert', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>The preview could not render</AlertTitle>
        <AlertDescription>Check the image links and try again.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The preview could not renderCheck the image links and try again.',
    );
  });

  it('keeps a LiveRegion polite and visually hidden while its message changes', () => {
    const { rerender } = render(<LiveRegion>{''}</LiveRegion>);
    rerender(<LiveRegion>Image inserted at position 3 of 8.</LiveRegion>);
    const region = screen.getByText('Image inserted at position 3 of 8.');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveClass('bl:sr-only');
  });

  it('keeps a decorative Separator out of the accessibility tree', () => {
    render(<Separator data-testid="rule" />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getByTestId('rule')).toHaveAttribute('data-orientation', 'horizontal');
  });
});
