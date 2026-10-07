import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  BlockBase,
  BrandKit,
  BuiltInBlockType,
  RenderOptions,
} from '@subterra-technologies/blockletter';
import { BUILT_IN_CANVASES } from '../src/canvas/blocks';
import { canvasProps, canvasTheme } from '../src/canvas/canvas-theme';
import type { BlockCanvasProps } from '../src/editor/types';
import { TEST_BRAND, everyBlock, testBlock } from './helpers/fixtures';

/** Draws one block with its built-in drawing, as the canvas would. */
function draw(
  block: BlockBase,
  { brand = TEST_BRAND, options = {} }: { brand?: BrandKit; options?: RenderOptions } = {},
) {
  const Drawing = BUILT_IN_CANVASES[block.type as BuiltInBlockType] as ComponentType<
    BlockCanvasProps<BlockBase>
  >;
  return render(<Drawing {...canvasProps(block, canvasTheme(brand, options))} />);
}

const sectionOf = (container: HTMLElement, block: BlockBase): HTMLElement => {
  const section = container.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
  if (!section) throw new Error(`No section for ${block.id}`);
  return section;
};

describe('the built-in drawings', () => {
  it('draws every block Blockletter ships, each in its own section', () => {
    for (const block of everyBlock()) {
      const { container, unmount } = draw(block);
      expect(sectionOf(container, block)).toBeInTheDocument();
      unmount();
    }
  });

  it('holds no links or headings of its own, so a canvas tab stays the only control', () => {
    for (const block of everyBlock()) {
      const { container, unmount } = draw(block);
      expect(container.querySelector('a, button, input, h1, h2, h3, h4, h5, h6')).toBeNull();
      unmount();
    }
  });
});

describe('HeaderCanvas', () => {
  it('draws the organisation over the title beside its issue label', () => {
    draw(testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' }));
    expect(screen.getByText('Harbor Lane Book Club')).toBeInTheDocument();
    expect(screen.getByText('Book club news · November 2026')).toBeInTheDocument();
  });

  it('prefers the block’s logo text, and the brand kit’s logo over both', () => {
    const { unmount } = draw(testBlock('header', { logoText: 'The Reading Room' }));
    expect(screen.getByText('The Reading Room')).toBeInTheDocument();
    unmount();

    draw(testBlock('header', { logoText: 'The Reading Room' }), {
      brand: { ...TEST_BRAND, logo: { url: 'https://images.example/logo.png' } },
    });
    expect(screen.getByRole('img', { name: 'The Reading Room' })).toHaveAttribute(
      'src',
      'https://images.example/logo.png',
    );
  });

  it('leaves out a separator with nothing on one side of it', () => {
    draw(testBlock('header', { title: 'Book club news', issueLabel: '' }));
    expect(screen.getByText('Book club news')).toBeInTheDocument();
  });
});

describe('LetterCanvas', () => {
  it('draws the heading, body and signature', () => {
    draw(
      testBlock('letter', {
        heading: 'From the chair',
        body: 'Autumn is our busiest season.\n\nThank you for reading with us.',
        signature: 'Ana Park, Chair',
      }),
    );
    expect(screen.getByText('From the chair')).toBeInTheDocument();
    expect(screen.getByText('Autumn is our busiest season.')).toBeInTheDocument();
    expect(screen.getByText('Thank you for reading with us.')).toBeInTheDocument();
    expect(screen.getByText('Ana Park, Chair')).toBeInTheDocument();
  });

  it('shows the empty-letter sentence when nothing has been written', () => {
    draw(testBlock('letter', { body: '   ' }));
    expect(
      screen.getByText('No letter written yet. It stays out of the email until it has text.'),
    ).toBeInTheDocument();
  });
});

describe('EventTilesCanvas', () => {
  it('draws each event as a day tile with its date, time and place', () => {
    draw(
      testBlock('event_tiles', {
        items: [
          {
            title: 'Author reading night',
            date: '2026-11-05',
            time: '7:00 PM',
            location: 'Main hall',
          },
        ],
      }),
    );
    expect(screen.getByText('Author reading night')).toBeInTheDocument();
    // The stored date is the organisation's own calendar date, so the 5th is the 5th.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Nov. 5 · 7:00 PM · Main hall')).toBeInTheDocument();
  });

  it('names the months in the host’s language', () => {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'mai',
      'jun',
      'jul',
      'aug',
      'sep',
      'okt',
      'nov',
      'des',
    ];
    draw(testBlock('event_tiles', { items: [{ title: 'Lesesirkel', date: '2026-10-08' }] }), {
      options: { labels: { months } },
    });
    expect(screen.getByText('okt 8')).toBeInTheDocument();
  });

  it('shows at most four tiles, as the email does', () => {
    const items = ['One', 'Two', 'Three', 'Four', 'Five'].map((title, index) => ({
      title,
      date: `2026-11-0${index + 1}`,
    }));
    draw(testBlock('event_tiles', { items }));
    expect(screen.getByText('Four')).toBeInTheDocument();
    expect(screen.queryByText('Five')).toBeNull();
  });

  it('shows the empty sentence when no events are chosen', () => {
    draw(testBlock('event_tiles', { items: [] }));
    expect(
      screen.getByText('No events chosen yet. The block stays out of the email until it has one.'),
    ).toBeInTheDocument();
  });
});

describe('SponsorsCanvas', () => {
  it('draws each sponsor’s logo or initials beside its thank-you', () => {
    draw(
      testBlock('sponsors', {
        items: [
          { name: 'Fairview Print Shop', message: 'Thanks for the bookmarks.' },
          {
            name: 'Oak & Iron Works',
            message: 'Thanks for the shelves.',
            logo: { url: 'https://images.example/oak.png' },
          },
        ],
      }),
    );
    expect(screen.getByText('FP')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Oak & Iron Works' })).toBeInTheDocument();
    expect(screen.getByText('Thanks for the bookmarks.')).toBeInTheDocument();
  });

  it('shows the empty sentence without sponsors', () => {
    draw(testBlock('sponsors', { items: [] }));
    expect(
      screen.getByText('No sponsors yet. The block stays out of the email until it has one.'),
    ).toBeInTheDocument();
  });
});

describe('NameListCanvas', () => {
  it('numbers each name over its second line', () => {
    draw(
      testBlock('name_list', {
        items: [{ name: 'Rosa Delgado', detail: 'Joined Nov. 2' }, { name: 'Ken Ito' }],
      }),
    );
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('Rosa Delgado')).toBeInTheDocument();
    expect(screen.getByText('Joined Nov. 2')).toBeInTheDocument();
  });

  it('keeps the heading and intro over the empty sentence', () => {
    draw(testBlock('name_list', { items: [] }));
    expect(screen.getByText('Welcome, new members!')).toBeInTheDocument();
    expect(
      screen.getByText('No names yet. The block stays out of the email until it has one.'),
    ).toBeInTheDocument();
  });
});

describe('CalloutCanvas', () => {
  it('draws the button once it has a link, and says so until then', () => {
    const { unmount } = draw(testBlock('callout', { ctaUrl: '' }));
    expect(screen.queryByText('Share your news')).toBeNull();
    expect(screen.getByText('The button appears once it has a link.')).toBeInTheDocument();
    unmount();

    draw(testBlock('callout', { ctaUrl: 'https://bookclub.example/news' }));
    expect(screen.getByText('Share your news')).toBeInTheDocument();
  });
});

describe('PostListCanvas', () => {
  it('draws the kicker, title, excerpt and Read more, in the host’s words', () => {
    draw(
      testBlock('post_list', {
        items: [
          {
            title: 'Our winter reading list',
            excerpt: 'Twelve books for long nights.',
            url: '/blog/winter-list',
            kicker: 'Lists',
          },
        ],
      }),
      { options: { labels: { readMore: 'Keep reading' } } },
    );
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByText('Our winter reading list')).toBeInTheDocument();
    expect(screen.getByText('Twelve books for long nights.')).toBeInTheDocument();
    expect(screen.getByText('Keep reading')).toBeInTheDocument();
  });
});

describe('ArticleCanvas', () => {
  it('fills the picture’s place with the kicker until there is a picture', () => {
    draw(testBlock('article', { kicker: 'Tips and tools', title: 'Shelving that lasts' }));
    expect(screen.getByText('TIPS AND TOOLS')).toBeInTheDocument();
    expect(screen.getByText('Shelving that lasts')).toBeInTheDocument();
  });
});

describe('DatedListCanvas', () => {
  it('lists the lines in calendar order, undated ones last', () => {
    const { container } = draw(
      testBlock('dated_list', {
        items: [
          { date: 'Every Saturday', text: 'Story hour' },
          { date: 'Nov. 20', text: 'Poetry swap', sortDate: '2026-11-20' },
          { date: 'Nov. 8', text: 'Used book sale', sortDate: '2026-11-08' },
        ],
      }),
    );
    const lines = [...container.querySelectorAll('strong')].map((date) => date.textContent);
    expect(lines).toEqual(['Nov. 8', 'Nov. 20', 'Every Saturday']);
  });
});

describe('TextCanvas', () => {
  it('splits a body on blank lines', () => {
    draw(testBlock('text', { body: 'One.\n\nTwo.' }));
    expect(screen.getByText('One.')).toBeInTheDocument();
    expect(screen.getByText('Two.')).toBeInTheDocument();
  });

  it('shows the empty-text sentence for an empty body', () => {
    draw(testBlock('text', { body: '' }));
    expect(
      screen.getByText('Empty text block. It stays out of the email until it has text.'),
    ).toBeInTheDocument();
  });
});

describe('a text block holding rich writing', () => {
  it('draws the formatting rather than printing the markup, and keeps it inert', () => {
    // The canvas is meant to look like the email. Escaping the body put "<p>Noon at the
    // <strong>library</strong>.</p>" on screen, tags and all.
    const { container } = draw(
      testBlock('text', {
        body: '<p>Noon at the <strong>library</strong>. <a href="https://bookclub.example">Map</a></p>',
        format: 'html',
      }),
    );
    expect(container.querySelector('strong')?.textContent).toBe('library');
    expect(container.textContent).not.toContain('<strong>');
    expect(screen.getByText('Map').closest('[inert]')).not.toBeNull();
  });

  it('still escapes a plain body, so angle brackets stay visible', () => {
    const { container } = draw(testBlock('text', { body: 'Use <b> for bold.' }));
    expect(container.textContent).toContain('Use <b> for bold.');
    expect(container.querySelector('b')).toBeNull();
  });

  it('leaves nothing dangerous in what it draws', () => {
    const { container } = draw(
      testBlock('text', {
        body: '<p onclick="alert(1)">Hi</p><script>alert(1)</script>',
        format: 'html',
      }),
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
  });
});

describe('ImageCanvas', () => {
  it('falls back to the alt text placeholder when there is no picture', () => {
    draw(testBlock('image', { alt: 'Readers at the summer picnic' }));
    expect(screen.getByText('Readers at the summer picnic')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('draws the picture the email will show', () => {
    draw(
      testBlock('image', {
        alt: 'Readers at the summer picnic',
        image: { url: 'https://images.example/picnic.jpg' },
      }),
    );
    expect(screen.getByRole('img', { name: 'Readers at the summer picnic' })).toHaveAttribute(
      'src',
      'https://images.example/picnic.jpg',
    );
  });

  it('shows the placeholder for an address no inbox can load, as the email does', () => {
    draw(testBlock('image', { alt: 'Picnic', image: { url: '/uploads/picnic.jpg' } }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Picnic')).toBeInTheDocument();
  });

  it('asks the host for the address when it resolves images itself', () => {
    draw(testBlock('image', { alt: 'Picnic', image: { url: '', assetId: 'asset-7' } }), {
      options: { resolveImageUrl: (ref) => `https://cdn.example/${ref.assetId}.jpg` },
    });
    expect(screen.getByRole('img', { name: 'Picnic' })).toHaveAttribute(
      'src',
      'https://cdn.example/asset-7.jpg',
    );
  });
});

describe('the smaller blocks', () => {
  it('draws the spacer at the height the email leaves empty', () => {
    const { container } = draw(testBlock('spacer', { size: 'large' }));
    const gap = container.querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(gap?.style.height).toBe('56px');
  });

  it('shows the quote placeholder until a quote is written', () => {
    draw(testBlock('quote', { quote: '' }));
    expect(
      screen.getByText('Add the quote. The block stays out of the email until it has one.'),
    ).toBeInTheDocument();
  });

  it('shows a dash and “Label” for a number with nothing typed', () => {
    draw(testBlock('stats', { items: [{ value: '', label: '' }] }));
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('draws a button with no label as a note, not as nothing', () => {
    draw(testBlock('button', { label: '' }));
    expect(
      screen.getByText('Button with no label. It stays out of the email until it has one.'),
    ).toBeInTheDocument();
  });
});

describe('FooterCanvas', () => {
  it('takes the organisation and blank contact details from the brand kit', () => {
    draw(testBlock('footer'));
    expect(screen.getByText('Harbor Lane Book Club')).toBeInTheDocument();
    expect(screen.getByText('12 Harbor Lane, Fairview')).toBeInTheDocument();
    expect(screen.getByText('(555) 010-0199')).toBeInTheDocument();
    expect(screen.getByText('hello@bookclub.example')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('prefers the block’s own details, and labels a website link by its host', () => {
    draw(
      testBlock('footer', {
        address: '40 Elm Row',
        social: [{ network: 'website', url: 'https://www.readers.example/about' }],
      }),
    );
    expect(screen.getByText('40 Elm Row')).toBeInTheDocument();
    expect(screen.getByText('readers.example')).toBeInTheDocument();
    expect(screen.queryByText('Instagram')).toBeNull();
  });

  it('shows the opt-out links the render options will add', () => {
    const { unmount } = draw(testBlock('footer'));
    expect(screen.queryByText('Unsubscribe')).toBeNull();
    unmount();

    draw(testBlock('footer'), {
      options: { preferencesUrl: '{{{PREFS}}}', unsubscribeUrl: '{{{UNSUB}}}' },
    });
    expect(screen.getByText('Manage preferences')).toBeInTheDocument();
    expect(screen.getByText('Unsubscribe')).toBeInTheDocument();
  });
});

describe('a block’s own style', () => {
  it('sets its section’s alignment, padding and background, as the renderer does', () => {
    const block = testBlock('text', {
      body: 'Hello.',
      style: { align: 'center', paddingY: 'loose', background: '#123456' },
    });
    const section = sectionOf(draw(block).container, block);
    expect(section.style.textAlign).toBe('center');
    expect(section.style.paddingTop).toBe('48px');
    expect(section.style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  it('runs a full-width block edge to edge', () => {
    const block = testBlock('text', { body: 'Hello.', style: { fullWidth: true } });
    const section = sectionOf(draw(block).container, block);
    expect(section.style.paddingLeft).toBe('0px');
    expect(section.style.paddingRight).toBe('0px');
  });

  it('paints every text colour in its text colour, and scales its type', () => {
    draw(
      testBlock('letter', {
        heading: 'From the chair',
        body: 'Hello.',
        style: { textColor: '#7c2d12', fontSize: 'large' },
      }),
    );
    const heading = screen.getByText('From the chair');
    expect(heading.style.color).toBe('rgb(124, 45, 18)');
    // 24px at the large scale (1.15), rounded as the renderer rounds it.
    expect(heading.style.fontSize).toBe('28px');
  });

  it('draws a hairline under the block', () => {
    const block = testBlock('divider', { style: { divider: true } });
    const section = sectionOf(draw(block).container, block);
    expect(section.style.borderBottom).toMatch(/^1px solid/);
  });
});
