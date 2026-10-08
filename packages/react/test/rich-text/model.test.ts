import { describe, expect, it } from 'vitest';
import {
  activeFormatting,
  applyMarks,
  caretAfterChange,
  caretAt,
  clearFormatting,
  insertFragment,
  insertInlines,
  linkAround,
  linkSelection,
  listOf,
  marksAt,
  splitParagraph,
  textToRichText,
  toggleList,
  toggleMark,
  typedMarks,
  type RichText,
  type TextSelection,
} from '../../src/rich-text/model';

const p = (...inlines: RichText[number]['inlines']): RichText[number] => ({ inlines });
const item = (list: 'ul' | 'ol', text: string): RichText[number] => ({
  list,
  inlines: [{ text }],
});
const select = (
  paragraph: number,
  offset: number,
  toParagraph = paragraph,
  toOffset = offset,
): TextSelection => ({
  anchor: { paragraph, offset },
  focus: { paragraph: toParagraph, offset: toOffset },
});

describe('toggleMark', () => {
  const doc: RichText = [p({ text: 'Join us Friday at nine.' })];

  it('bolds the selected words, splitting the run around them', () => {
    expect(toggleMark(doc, select(0, 8, 0, 14), 'bold')).toEqual([
      p({ text: 'Join us ' }, { text: 'Friday', bold: true }, { text: ' at nine.' }),
    ]);
  });

  it('takes the mark off when every selected character has it, and merges the runs again', () => {
    const bold = toggleMark(doc, select(0, 8, 0, 14), 'bold');
    expect(toggleMark(bold, select(0, 8, 0, 14), 'bold')).toEqual(doc);
  });

  it('puts the mark on all of a selection only partly marked', () => {
    const partly = toggleMark(doc, select(0, 8, 0, 14), 'italic');
    expect(toggleMark(partly, select(0, 0, 0, 14), 'italic')).toEqual([
      p({ text: 'Join us Friday', italic: true }, { text: ' at nine.' }),
    ]);
  });

  it('works across paragraphs, a selection backwards included', () => {
    const two: RichText = [p({ text: 'One' }), p({ text: 'Two' })];
    expect(toggleMark(two, select(1, 2, 0, 1), 'bold')).toEqual([
      p({ text: 'O' }, { text: 'ne', bold: true }),
      p({ text: 'Tw', bold: true }, { text: 'o' }),
    ]);
  });

  it('changes nothing for a selection with no text in it', () => {
    expect(toggleMark(doc, select(0, 3), 'bold')).toBe(doc);
  });
});

describe('applyMarks', () => {
  it('gives the selection exactly the marks asked for', () => {
    const doc: RichText = [p({ text: 'ab', bold: true }, { text: 'cd', italic: true })];
    expect(applyMarks(doc, select(0, 1, 0, 3), { bold: false, italic: true })).toEqual([
      p({ text: 'a', bold: true }, { text: 'bcd', italic: true }),
    ]);
  });
});

describe('links', () => {
  const doc: RichText = [p({ text: 'See the agenda now.' })];
  const linked = linkSelection(doc, select(0, 8, 0, 14), 'https://example.test/agenda');

  it('links the selected words', () => {
    expect(linked).toEqual([
      p(
        { text: 'See the ' },
        { text: 'agenda', href: 'https://example.test/agenda' },
        { text: ' now.' },
      ),
    ]);
  });

  it('finds the whole link from a caret inside it or at either end, and from part of it', () => {
    const span = {
      href: 'https://example.test/agenda',
      start: { paragraph: 0, offset: 8 },
      end: { paragraph: 0, offset: 14 },
    };
    expect(linkAround(linked, select(0, 10))).toEqual(span);
    expect(linkAround(linked, select(0, 8))).toEqual(span);
    expect(linkAround(linked, select(0, 14))).toEqual(span);
    expect(linkAround(linked, select(0, 9, 0, 11))).toEqual(span);
    expect(linkAround(linked, select(0, 2))).toBeUndefined();
    // A selection reaching past the link is a new link, not this one.
    expect(linkAround(linked, select(0, 4, 0, 11))).toBeUndefined();
  });

  it('keeps a link whole across differently formatted runs', () => {
    const mixed = toggleMark(linked, select(0, 8, 0, 10), 'bold');
    expect(linkAround(mixed, select(0, 12))?.start.offset).toBe(8);
    expect(linkAround(mixed, select(0, 12))?.end.offset).toBe(14);
  });

  it('removes a link', () => {
    expect(linkSelection(linked, select(0, 8, 0, 14), undefined)).toEqual(doc);
  });

  it('does not lengthen a link by typing at either end, only inside it', () => {
    expect(marksAt(linked, { paragraph: 0, offset: 14 }).href).toBeUndefined();
    expect(marksAt(linked, { paragraph: 0, offset: 8 }).href).toBeUndefined();
    expect(marksAt(linked, { paragraph: 0, offset: 10 }).href).toBe('https://example.test/agenda');
  });
});

describe('marks for typing', () => {
  const doc: RichText = [p({ text: 'bold', bold: true }, { text: ' plain' }, { br: true })];

  it('takes the formatting of the character before the caret', () => {
    expect(marksAt(doc, { paragraph: 0, offset: 4 })).toEqual({ bold: true, italic: false });
    expect(marksAt(doc, { paragraph: 0, offset: 5 })).toEqual({ bold: false, italic: false });
  });

  it('takes the one after the caret at the start of a line', () => {
    expect(marksAt(doc, { paragraph: 0, offset: 0 })).toEqual({ bold: true, italic: false });
  });

  it('types over a selection in the formatting of its first character', () => {
    expect(typedMarks(doc, select(0, 2, 0, 7))).toEqual({ bold: true, italic: false });
  });
});

describe('lists', () => {
  const doc: RichText = [p({ text: 'One' }), p({ text: 'Two' }), p({ text: 'Three' })];

  it('makes every paragraph the selection touches an item, and plain again', () => {
    const listed = toggleList(doc, select(0, 1, 1, 1), 'ul');
    expect(listed).toEqual([item('ul', 'One'), item('ul', 'Two'), p({ text: 'Three' })]);
    expect(listOf(listed, select(0, 1, 1, 1))).toBe('ul');
    expect(toggleList(listed, select(0, 1, 1, 1), 'ul')).toEqual(doc);
  });

  it('switches items of the other kind of list', () => {
    const bulleted = toggleList(doc, select(0, 0, 2, 0), 'ul');
    expect(toggleList(bulleted, select(1, 0), 'ol')[1]).toEqual(item('ol', 'Two'));
  });

  it('leaves out a paragraph the selection only reaches the very start of', () => {
    expect(toggleList(doc, select(0, 0, 1, 0), 'ol')).toEqual([
      item('ol', 'One'),
      p({ text: 'Two' }),
      p({ text: 'Three' }),
    ]);
  });
});

describe('clearFormatting', () => {
  it('takes bold, italics and links off the selection', () => {
    const doc: RichText = [
      p({ text: 'a', bold: true }, { text: 'b', italic: true, href: 'https://example.test' }),
    ];
    expect(clearFormatting(doc, select(0, 0, 0, 2))).toEqual([p({ text: 'ab' })]);
  });

  it('takes it off the whole paragraph from a caret, and leaves its list alone', () => {
    const doc: RichText = [{ list: 'ul', inlines: [{ text: 'Bring a guest', bold: true }] }];
    expect(clearFormatting(doc, select(0, 3))).toEqual([item('ul', 'Bring a guest')]);
  });
});

describe('Enter', () => {
  it('splits the paragraph at the caret, both halves keeping its list', () => {
    const doc: RichText = [item('ul', 'Welcome')];
    expect(splitParagraph(doc, select(0, 3))).toEqual({
      doc: [item('ul', 'Wel'), item('ul', 'come')],
      selection: caretAt({ paragraph: 1, offset: 0 }),
    });
  });

  it('ends the list in an empty item', () => {
    const doc: RichText = [item('ul', 'Welcome'), { list: 'ul', inlines: [] }];
    expect(splitParagraph(doc, select(1, 0)).doc).toEqual([item('ul', 'Welcome'), p()]);
  });

  it('replaces a selection', () => {
    const doc: RichText = [p({ text: 'One' }), p({ text: 'Two' })];
    expect(splitParagraph(doc, select(0, 1, 1, 2)).doc).toEqual([
      p({ text: 'O' }),
      p({ text: 'o' }),
    ]);
  });
});

describe('insertInlines', () => {
  it('puts text in at the caret and moves the caret past it', () => {
    const doc: RichText = [p({ text: 'Hello world' })];
    expect(insertInlines(doc, select(0, 5), [{ text: ',', bold: true }])).toEqual({
      doc: [p({ text: 'Hello' }, { text: ',', bold: true }, { text: ' world' })],
      selection: caretAt({ paragraph: 0, offset: 6 }),
    });
  });

  it('counts a line break as one place', () => {
    const doc: RichText = [p({ text: 'ab' })];
    const edit = insertInlines(doc, select(0, 1), [{ br: true }]);
    expect(edit.doc).toEqual([p({ text: 'a' }, { br: true }, { text: 'b' })]);
    expect(edit.selection.anchor.offset).toBe(2);
  });
});

describe('insertFragment', () => {
  const doc: RichText = [p({ text: 'Hello world' })];

  it('puts one pasted paragraph in at the caret', () => {
    const edit = insertFragment(doc, select(0, 6), [p({ text: 'big ', bold: true })]);
    expect(edit.doc).toEqual([
      p({ text: 'Hello ' }, { text: 'big ', bold: true }, { text: 'world' }),
    ]);
    expect(edit.selection.anchor).toEqual({ paragraph: 0, offset: 10 });
  });

  it('splits the paragraph around several, joining the first and last to either side', () => {
    const edit = insertFragment(doc, select(0, 6), [
      p({ text: 'A' }),
      p({ text: 'B' }),
      p({ text: 'C' }),
    ]);
    expect(edit.doc).toEqual([p({ text: 'Hello A' }), p({ text: 'B' }), p({ text: 'Cworld' })]);
    expect(edit.selection.anchor).toEqual({ paragraph: 2, offset: 1 });
  });

  it('keeps a pasted list a list, splitting the paragraph it lands in', () => {
    const edit = insertFragment(doc, select(0, 6), [item('ol', 'One'), item('ol', 'Two')]);
    expect(edit.doc).toEqual([
      p({ text: 'Hello ' }),
      item('ol', 'One'),
      item('ol', 'Two'),
      p({ text: 'world' }),
    ]);
    expect(edit.selection.anchor).toEqual({ paragraph: 2, offset: 3 });
  });

  it('makes pasted paragraphs items of the list they land in', () => {
    const list: RichText = [item('ul', 'Bring a guest')];
    const edit = insertFragment(list, select(0, 13), [p({ text: '!' }), p({ text: 'Lunch' })]);
    expect(edit.doc).toEqual([item('ul', 'Bring a guest!'), item('ul', 'Lunch')]);
  });

  it('replaces an empty paragraph with a pasted list rather than leaving a blank line', () => {
    const edit = insertFragment([p()], select(0, 0), [item('ul', 'One')]);
    expect(edit.doc).toEqual([item('ul', 'One')]);
  });

  it('replaces the selection', () => {
    const edit = insertFragment(doc, select(0, 0, 0, 5), [p({ text: 'Goodbye' })]);
    expect(edit.doc).toEqual([p({ text: 'Goodbye world' })]);
  });
});

describe('activeFormatting', () => {
  const doc: RichText = [
    {
      list: 'ol',
      inlines: [
        { text: 'bold', bold: true },
        { text: ' link', href: 'https://example.test' },
      ],
    },
  ];

  it('says what a selection has throughout', () => {
    expect(activeFormatting(doc, select(0, 0, 0, 4))).toEqual({
      bold: true,
      italic: false,
      link: false,
      list: 'ol',
    });
    expect(activeFormatting(doc, select(0, 0, 0, 6)).bold).toBe(false);
    expect(activeFormatting(doc, select(0, 7)).link).toBe(true);
  });

  it('shows marks chosen for the next keystroke at a caret', () => {
    expect(activeFormatting(doc, select(0, 7), { bold: true, italic: true })).toMatchObject({
      bold: true,
      italic: true,
    });
  });
});

describe('caretAfterChange', () => {
  const words = (text: string, extra: Partial<RichText[number]> = {}): RichText[number] => ({
    inlines: [{ text }],
    ...extra,
  });

  it('puts the caret just after the part that changed', () => {
    const before: RichText = [words('Join us Friday at nine sharp.')];
    const after: RichText = [words('Join us Friday at nine.')];
    expect(caretAfterChange(before, after)).toEqual({ paragraph: 0, offset: 22 });
    expect(caretAfterChange(after, before)).toEqual({ paragraph: 0, offset: 28 });
  });

  it('counts formatting and lists as changes, and paragraphs as places', () => {
    const plain: RichText = [words('One'), words('Join us Friday.')];
    const bold: RichText = [
      words('One'),
      p({ text: 'Join us ' }, { text: 'Friday', bold: true }, { text: '.' }),
    ];
    expect(caretAfterChange(bold, plain)).toEqual({ paragraph: 1, offset: 14 });
    expect(caretAfterChange(plain, bold)).toEqual({ paragraph: 1, offset: 14 });
    const listed: RichText = [words('One'), words('Join us Friday.', { list: 'ul' })];
    expect(caretAfterChange(plain, listed)).toEqual({ paragraph: 1, offset: 0 });
  });

  it('says nothing changed when nothing did', () => {
    expect(caretAfterChange([words('Same')], [words('Same')])).toBeUndefined();
  });
});

describe('textToRichText', () => {
  it('reads blank lines as paragraphs and single newlines as line breaks', () => {
    expect(textToRichText('Hi all,\r\n\r\nLine one\nLine two\n')).toEqual([
      p({ text: 'Hi all,' }),
      p({ text: 'Line one' }, { br: true }, { text: 'Line two' }),
    ]);
  });

  it('gives the text the formatting where it lands', () => {
    expect(textToRichText('loud', { bold: true, italic: false })).toEqual([
      p({ text: 'loud', bold: true }),
    ]);
  });

  it('is nothing for blank text', () => {
    expect(textToRichText(' \n\n ')).toEqual([]);
  });
});
