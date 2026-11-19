import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  builtInBlocks,
  createBlock,
  defineBlock,
  field,
  type BlockOf,
} from '@subterra-technologies/blockletter';
import { NewsletterCanvas } from '../../src/canvas/canvas';
import { defineEditorBlock, type EditorBlockDefinition } from '../../src/editor/types';
import type { FieldEditorProps } from '../../src/inspector/fields-form';
import { renderEditor } from '../helpers/editor-registry';
import { renderInEditor } from '../helpers/render';

const Icon = () => null;

const eventBlock = defineBlock({
  type: 'talk',
  label: 'Talk',
  description: 'A talk with its speakers.',
  group: 'content',
  fields: {
    title: field.text({ default: 'Opening keynote', help: 'What the talk is called.' }),
    room: field.text({ optional: true }),
    abstract: field.markdown({ label: 'Abstract' }),
    url: field.url({ label: 'Booking link' }),
    poster: field.image({ label: 'Poster' }),
    level: field.choice({ options: ['beginner', 'advanced'] }),
    track: field.choice({ options: ['a', 'b', 'c', 'd', 'e'], display: 'select' }),
    seats: field.number({ min: 1, max: 500, integer: true }),
    recorded: field.toggle({ label: 'Recorded' }),
    day: field.date({ optional: true }),
    accent: field.color({ label: 'Accent colour' }),
    cta: field.link({ label: 'Button' }),
    speakers: field.list({
      item: { name: field.text(), role: field.text({ optional: true }) },
      min: 1,
      max: 2,
      itemLabel: 'speaker',
    }),
  },
  render: (block, ctx) =>
    ctx.section(block, `<p style="${ctx.bodyStyle()}">${ctx.escape(block.title)}</p>`),
});

type TalkBlock = BlockOf<typeof eventBlock>;

const talkEditor = defineEditorBlock({ ...eventBlock, icon: Icon });
const talk = (): TalkBlock => ({ ...eventBlock.create(), id: 't1', type: 'talk', hidden: false });

describe('the form built from a block’s fields', () => {
  it('draws a labelled control for every field, in order', () => {
    renderEditor(talkEditor.Editor, talk());
    expect(screen.getByLabelText('Title')).toHaveValue('Opening keynote');
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('What the talk is called.');
    expect(screen.getByLabelText('Room (optional)')).toHaveValue('');
    expect(screen.getByRole('toolbar', { name: 'Abstract formatting' })).toBeInTheDocument();
    expect(screen.getByLabelText('Booking link')).toHaveAttribute('type', 'url');
    expect(screen.getByText('Poster (optional)')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Track' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seats')).toHaveValue(1);
    expect(screen.getByRole('checkbox', { name: 'Recorded' })).not.toBeChecked();
    expect(screen.getByLabelText('Day (optional)')).toHaveAttribute('type', 'date');
    const cta = screen.getByRole('group', { name: 'Button' });
    expect(within(cta).getByLabelText('Label')).toHaveValue('');
    expect(screen.getByText('Speaker 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add speaker' })).toBeInTheDocument();
  });

  it('writes what is typed into the block', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(talkEditor.Editor, talk());
    await user.type(screen.getByLabelText('Title'), '!');
    expect(latest().title).toBe('Opening keynote!');
    await user.click(screen.getByRole('radio', { name: 'Advanced' }));
    expect(latest().level).toBe('advanced');
    await user.click(screen.getByRole('checkbox', { name: 'Recorded' }));
    expect(latest().recorded).toBe(true);
    await user.type(
      within(screen.getByRole('group', { name: 'Button' })).getByLabelText('Link'),
      '/book',
    );
    expect(latest().cta).toEqual({ label: '', url: '/book' });
  });

  it('stores a number once the text is one, keeping a half-typed one on screen', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(talkEditor.Editor, talk());
    const seats = screen.getByLabelText('Seats');
    await user.clear(seats);
    await user.type(seats, '40');
    expect(latest().seats).toBe(40);
    expect(seats).toHaveValue(40);
  });

  it('drops an optional field that is cleared, rather than storing it blank', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(talkEditor.Editor, { ...talk(), room: 'Hall A' });
    await user.clear(screen.getByLabelText('Room (optional)'));
    expect(latest()).not.toHaveProperty('room');
  });

  it('adds, fills and removes a list’s items, within its limits', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(talkEditor.Editor, talk());
    await user.click(screen.getByRole('button', { name: 'Add speaker' }));
    expect(latest().speakers).toEqual([{ name: '' }, { name: '' }]);
    expect(screen.getByRole('button', { name: 'Add speaker' })).toBeDisabled();
    expect(screen.getByText('This list holds up to 2.')).toBeInTheDocument();
    const second = screen.getAllByLabelText('Name')[1]!;
    await user.type(second, 'Ada');
    expect(latest().speakers).toEqual([{ name: '' }, { name: 'Ada' }]);
    await user.type(screen.getAllByLabelText('Role (optional)')[1]!, 'Host');
    await user.clear(screen.getAllByLabelText('Role (optional)')[1]!);
    expect(latest().speakers[1]).toEqual({ name: 'Ada' });
    await user.click(screen.getByRole('button', { name: 'Remove speaker 1' }));
    expect(latest().speakers).toEqual([{ name: 'Ada' }]);
    expect(screen.getByRole('button', { name: 'Remove speaker 1' })).toBeDisabled();
  });

  it('disables every control when the issue is read-only', () => {
    renderEditor(talkEditor.Editor, talk(), { readOnly: true });
    expect(screen.getByLabelText('Title')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Recorded' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add speaker' })).toBeDisabled();
  });
});

describe('controls of the host’s own', () => {
  const rated = defineBlock({
    type: 'rated',
    label: 'Rated',
    description: 'Stars.',
    group: 'content',
    fields: {
      stars: field.custom({ default: 3, label: 'Stars' }),
      quotes: field.list({ item: { text: field.text(), mood: field.custom({ default: 'calm' }) } }),
    },
    render: () => '',
  });
  type Rated = BlockOf<typeof rated>;
  const block = (): Rated => ({
    ...rated.create(),
    quotes: [{ text: 'Hi', mood: 'calm' }],
    id: 'r',
    type: 'rated',
    hidden: false,
  });

  function Stars({ value, onChange, label }: FieldEditorProps) {
    return (
      <button type="button" onClick={() => onChange((value as number) + 1)}>
        {`${label}: ${String(value)}`}
      </button>
    );
  }

  it('say so in place of a field of their own kind the form cannot draw', () => {
    renderEditor(defineEditorBlock({ ...rated, icon: Icon }).Editor, block());
    expect(screen.getByText(/“Stars” can’t be changed here/)).toBeInTheDocument();
  });

  it('are used for the fields they name, inside lists too', async () => {
    const user = userEvent.setup();
    const Mood = ({ value }: FieldEditorProps) => <p>{`Mood is ${String(value)}`}</p>;
    const definition = defineEditorBlock({
      ...rated,
      icon: Icon,
      fieldEditors: { stars: Stars, 'quotes.mood': Mood },
    });
    expect(definition).not.toHaveProperty('fieldEditors');
    const { latest } = renderEditor(definition.Editor, block());
    expect(screen.getByText('Mood is calm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stars: 3' }));
    expect(latest().stars).toBe(4);
  });
});

describe('defineEditorBlock', () => {
  it('keeps a form of the block’s own', () => {
    const Editor = () => null;
    expect(defineEditorBlock({ ...eventBlock, icon: Icon, Editor }).Editor).toBe(Editor);
  });

  it('wants a form, or fields to build one from', () => {
    const definition = builtInBlocks.find((candidate) => candidate.type === 'text')!;
    expect(() =>
      defineEditorBlock({ ...definition, icon: Icon } as unknown as EditorBlockDefinition),
    ).toThrow('needs an Editor, or fields to build one from');
  });

  it('leaves the canvas to draw the block’s email', () => {
    const definitions: readonly EditorBlockDefinition[] = [talkEditor];
    const block = createBlock('talk', definitions);
    renderInEditor(<NewsletterCanvas blocks={[block]} />, { context: { definitions } });
    expect(screen.getByText('Opening keynote')).toBeInTheDocument();
  });
});
