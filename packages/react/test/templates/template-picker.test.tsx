import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_TEMPLATES, type NewsletterTemplate } from '@subterra-technologies/blockletter';
import { TemplatePicker, type TemplatePickerProps } from '../../src/templates/template-picker';
import { TEST_TEMPLATES } from '../helpers/fixtures';
import { renderInEditor } from '../helpers/render';

const SAVED = TEST_TEMPLATES[0] as NewsletterTemplate;
const TEMPLATES: NewsletterTemplate[] = [...BUILT_IN_TEMPLATES, SAVED];

/** A controlled picker over a host that really renames and deletes. */
function renderPicker(props: Partial<TemplatePickerProps> = {}) {
  const onChange = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();
  function Host() {
    const [templates, setTemplates] = useState(props.templates ?? TEMPLATES);
    const [value, setValue] = useState<string | null>(props.value ?? null);
    return (
      <TemplatePicker
        templates={templates}
        value={value}
        onChange={(id) => {
          onChange(id);
          setValue(id);
        }}
        onRename={async (id, name, description) => {
          await onRename(id, name, description);
          setTemplates(
            (list) =>
              list?.map((item) => (item.id === id ? { ...item, name, description } : item)) ?? null,
          );
        }}
        onDelete={async (id) => {
          await onDelete(id);
          setTemplates((list) => list?.filter((item) => item.id !== id) ?? null);
        }}
        allowBlank={props.allowBlank}
        disabled={props.disabled}
      />
    );
  }
  renderInEditor(<Host />);
  return { onChange, onRename, onDelete };
}

describe('TemplatePicker', () => {
  it('says it is loading while the templates are null', () => {
    renderInEditor(<TemplatePicker templates={null} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading templates…');
  });

  it('offers each template as a radio card in one labelled group', () => {
    renderPicker();
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(
      TEMPLATES.map((template) => template.id),
    );
    // Nothing chosen yet: no card is checked.
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });

  it('adds a Blank card, chosen when the value is null', () => {
    renderPicker({ allowBlank: true });
    expect(screen.getByRole('radio', { name: 'Blank' })).toBeChecked();
  });

  it('reports the chosen template’s id, and null for Blank', async () => {
    const { onChange } = renderPicker({ allowBlank: true });
    await userEvent.click(screen.getByRole('radio', { name: 'Spotlight' }));
    expect(onChange).toHaveBeenLastCalledWith('spotlight');
    await userEvent.click(screen.getByRole('radio', { name: 'Blank' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('chooses a card by its name, which is the radio’s label', async () => {
    // The label also stretches over the whole card (a CSS ::after), which jsdom cannot click.
    const { onChange } = renderPicker();
    await userEvent.click(screen.getByText(SAVED.name));
    expect(onChange).toHaveBeenLastCalledWith(SAVED.id);
  });

  it('moves the choice with the arrow keys, as a radio group does', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: 'monthly-newsletter' });
    await user.click(screen.getByRole('radio', { name: 'Monthly newsletter' }));
    await user.keyboard('{ArrowDown>}');
    expect(onChange).toHaveBeenLastCalledWith('event-announcement');
    expect(screen.getByRole('radio', { name: 'Event announcement' })).toHaveFocus();
  });

  it('describes each card by its description and block count, and badges the built-ins', () => {
    renderPicker();
    const monthly = BUILT_IN_TEMPLATES[0] as NewsletterTemplate;
    expect(screen.getByRole('radio', { name: monthly.name })).toHaveAccessibleDescription(
      `${monthly.description} ${monthly.blocks.length} blocks`,
    );
    expect(screen.getAllByText('Built in')).toHaveLength(BUILT_IN_TEMPLATES.length);
  });

  it('offers no rename or delete on a built-in template', () => {
    renderPicker({ templates: [...BUILT_IN_TEMPLATES] });
    expect(screen.queryByRole('button', { name: /^Rename/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('offers no rename or delete when the host does not handle them', () => {
    renderInEditor(<TemplatePicker templates={[SAVED]} value={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Rename/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('shows the empty sentence when there are no templates', () => {
    renderPicker({ templates: [] });
    expect(
      screen.getByText('No saved templates yet — save one from any issue you like.'),
    ).toBeInTheDocument();
  });

  it('renames a saved template in place, and says so', async () => {
    const user = userEvent.setup();
    const { onRename } = renderPicker();
    await user.click(screen.getByRole('button', { name: `Rename ${SAVED.name}` }));
    const name = screen.getByLabelText('Template name');
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('maxlength', '80');
    await user.clear(name);
    await user.type(name, 'Spring kickoff');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onRename).toHaveBeenCalledWith(SAVED.id, 'Spring kickoff', SAVED.description);
    expect(await screen.findByText('Template renamed to “Spring kickoff”.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Spring kickoff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename Spring kickoff' })).toHaveFocus();
  });

  it('saves the new name on Enter, without submitting the form around it', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const onRename = vi.fn();
    renderInEditor(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <TemplatePicker templates={[SAVED]} value={null} onChange={vi.fn()} onRename={onRename} />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: `Rename ${SAVED.name}` }));
    await userEvent.type(screen.getByLabelText('Description'), ' Updated.{Enter}');
    expect(onRename).toHaveBeenCalledWith(SAVED.id, SAVED.name, `${SAVED.description} Updated.`);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('will not rename to nothing', async () => {
    const { onRename } = renderPicker();
    await userEvent.click(screen.getByRole('button', { name: `Rename ${SAVED.name}` }));
    await userEvent.clear(screen.getByLabelText('Template name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give the template a name.');
    expect(screen.getByLabelText('Template name')).toHaveFocus();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('cancels a rename, and gives focus back to Rename', async () => {
    const { onRename } = renderPicker();
    await userEvent.click(screen.getByRole('button', { name: `Rename ${SAVED.name}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Template name')).toBeNull();
    expect(screen.getByRole('button', { name: `Rename ${SAVED.name}` })).toHaveFocus();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('shows the host’s message when a rename fails', async () => {
    renderInEditor(
      <TemplatePicker
        templates={[SAVED]}
        value={null}
        onChange={vi.fn()}
        onRename={() => Promise.reject(new Error('A template with that name already exists.'))}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: `Rename ${SAVED.name}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A template with that name already exists.',
    );
    expect(screen.getByLabelText('Template name')).toBeInTheDocument();
  });

  it('asks before deleting a saved template, clears the choice it held, and says so', async () => {
    const user = userEvent.setup();
    const { onChange, onDelete } = renderPicker({ value: SAVED.id });
    await user.click(screen.getByRole('button', { name: `Delete ${SAVED.name}` }));
    const dialog = await screen.findByRole('alertdialog', {
      name: `Delete the template “${SAVED.name}”?`,
    });
    expect(dialog).toHaveAccessibleDescription(
      'Issues already started from it keep their layout. This can’t be undone.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete template' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(SAVED.id));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(await screen.findByText(`Template “${SAVED.name}” deleted.`)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: SAVED.name })).toBeNull();
    // Its Delete button went with it: focus lands back in the choices.
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Monthly newsletter' })).toHaveFocus(),
    );
  });

  it('does not delete when the question is declined', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderPicker();
    await user.click(screen.getByRole('button', { name: `Delete ${SAVED.name}` }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: SAVED.name })).toBeInTheDocument();
  });

  it('disables every card while disabled', () => {
    renderPicker({ disabled: true });
    expect(screen.getByRole('group', { name: 'Layout' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: SAVED.name })).toBeDisabled();
  });
});
