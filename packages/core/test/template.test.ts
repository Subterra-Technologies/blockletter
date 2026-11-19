import { describe, expect, it } from 'vitest';
import {
  defineBlock,
  field,
  renderBlock,
  renderEmail,
  createDocument,
  builtInBlocks,
  type BlockBase,
  type RenderContext,
  type RenderOptions,
} from '../src';
import { BASE_URL } from './helpers';

/** What `draw` makes with a fresh block's context, and the render's warnings. */
function drawn(draw: (ctx: RenderContext) => string, options: RenderOptions = {}) {
  let html = '';
  const probe = defineBlock<BlockBase<'probe'>>({
    type: 'probe',
    label: 'Probe',
    description: '',
    group: 'content',
    create: () => ({}),
    validate: () => [],
    render(_block, ctx) {
      html = draw(ctx);
      return '';
    },
  });
  const rendered = renderBlock(
    { id: 'p', type: 'probe', hidden: false },
    { definitions: [probe], ...options },
  );
  return { html, warnings: rendered.warnings };
}

const html = (draw: (ctx: RenderContext) => string, options?: RenderOptions) =>
  drawn(draw, options).html;

const HOSTILE = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "' onmouseover='alert(1)",
  '</p><a href="javascript:alert(1)">x</a>',
  '<!--',
  '&lt;script&gt;',
];

describe('ctx.html in element content', () => {
  it('escapes text and numbers', () => {
    expect(html((ctx) => ctx.html`<p>${'Fish & <chips>'} ${3}</p>`)).toBe(
      '<p>Fish &amp; &lt;chips&gt; 3</p>',
    );
  });

  it('inserts the HTML the context made as it is, nested templates too', () => {
    const out = html((ctx) => {
      const heading = ctx.heading('Hi & bye');
      const inner = ctx.html`<em>${'a<b'}</em>`;
      return ctx.html`${heading}<p>${inner}</p>${ctx.button('Go', 'https://example.test')}`;
    });
    expect(out).toContain('<h2 style="');
    expect(out).toContain('>Hi &amp; bye</h2>');
    expect(out).toContain('<p><em>a&lt;b</em></p>');
    expect(out).toContain('<a href="https://example.test"');
  });

  it('takes what markdown, inlineMarkdown, optionalLink and richText return', () => {
    const out = html((ctx) => {
      const body = ctx.markdown('Some **bold**');
      const line = ctx.inlineMarkdown('*slanted*');
      const link = ctx.optionalLink('More', 'https://example.test/more');
      const rich = ctx.richText('<p>Rich <strong>text</strong></p>');
      return ctx.html`${body}${line}${link}${rich}`;
    });
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>slanted</em>');
    expect(out).toContain('>More</a>');
    expect(out).toContain('Rich <strong');
  });

  it('escapes an { html } it did not make', () => {
    expect(html((ctx) => ctx.html`<p>${{ html: '<b>x</b>' }}</p>`)).toBe(
      '<p>&lt;b&gt;x&lt;/b&gt;</p>',
    );
  });

  it('joins lists, and draws nothing for null, undefined and booleans', () => {
    const out = html(
      (ctx) =>
        ctx.html`<ul>${['a', 'b<'].map((item) => ctx.html`<li>${item}</li>`)}</ul>${null}${undefined}${false}${true}`,
    );
    expect(out).toBe('<ul><li>a</li><li>b&lt;</li></ul>');
  });

  it('inserts raw HTML as it is', () => {
    expect(html((ctx) => ctx.html`<p>${ctx.raw('<b>ours</b>')}</p>`)).toBe('<p><b>ours</b></p>');
  });

  it('leaves no hostile text able to make a tag', () => {
    for (const payload of HOSTILE) {
      const out = html((ctx) => ctx.html`<p>${payload}</p>`);
      expect(out.slice(3, -4), payload).not.toMatch(/[<>"']/);
    }
  });
});

describe('ctx.html inside a tag', () => {
  it('escapes an attribute’s value, so it cannot leave its quotes', () => {
    for (const payload of HOSTILE) {
      const out = html((ctx) => ctx.html`<img alt="${payload}" src="https://x.test/a.png">`);
      expect(out, payload).toMatch(/^<img alt="[^"<>]*" src="https:\/\/x\.test\/a\.png">$/);
    }
  });

  it('puts quotes around a value the template left them off', () => {
    expect(html((ctx) => ctx.html`<td width=${40} title=${'a b onclick=x'}>`)).toBe(
      '<td width="40" title="a b onclick=x">',
    );
  });

  it('escapes even HTML the context made, which belongs in content', () => {
    const out = html((ctx) => ctx.html`<p title="${ctx.heading('x')}">`);
    expect(out).toMatch(/^<p title="&lt;h2 style=&quot;[^"]*&gt;x&lt;\/h2&gt;">$/);
  });

  it('resolves a link’s address, so it is absolute and never a script', () => {
    const options = { baseUrl: BASE_URL };
    expect(html((ctx) => ctx.html`<a href="${'/events'}">`, options)).toBe(
      `<a href="${BASE_URL}/events">`,
    );
    expect(html((ctx) => ctx.html`<a href="${'javascript:alert(1)'}">`, options)).toBe(
      `<a href="${BASE_URL}">`,
    );
    expect(html((ctx) => ctx.html`<a class="x" href = '${'example.org'}'>`)).toBe(
      `<a class="x" href = 'https://example.org'>`,
    );
    expect(html((ctx) => ctx.html`<a href=${'/news'}>`, options)).toBe(
      `<a href="${BASE_URL}/news">`,
    );
  });

  it('resolves an address once, and warns of a relative one once', () => {
    const { html: out, warnings } = drawn(
      (ctx) => ctx.html`<a href="${ctx.url('/a')}">x</a><a href="${'/a'}">y</a>`,
    );
    expect(out).toBe('<a href="/a">x</a><a href="/a">y</a>');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Some links are relative/);
  });

  it('leaves a value inside an address as it is, escaped', () => {
    expect(html((ctx) => ctx.html`<a href="https://example.test/jobs/${'a"b'}">`)).toBe(
      '<a href="https://example.test/jobs/a&quot;b">',
    );
  });

  it('refuses text where an attribute’s name goes, but takes raw attributes or nothing', () => {
    expect(() => html((ctx) => ctx.html`<td ${'onclick=alert(1)'}>`)).toThrow(
      'must be an attribute’s value',
    );
    expect(html((ctx) => ctx.html`<td ${ctx.raw('class="x"')}>`)).toBe('<td class="x">');
    expect(html((ctx) => ctx.html`<td ${''}${null}${false}>`)).toBe('<td >');
  });

  it('knows a tag has ended once its > is written', () => {
    expect(html((ctx) => ctx.html`<p class="a>b">${'<i>'}</p>`)).toBe(
      '<p class="a>b">&lt;i&gt;</p>',
    );
  });
});

describe('ctx.html’s layout of the source', () => {
  it('drops line breaks and indentation beside tags and at the ends', () => {
    const out = html(
      (ctx) => ctx.html`
        <table>
          <tr>
            <td>${'a'}</td>
          </tr>
        </table>
      `,
    );
    expect(out).toBe('<table><tr><td>a</td></tr></table>');
  });

  it('reads a line break inside text as a space, and keeps spaces on one line', () => {
    const out = html(
      (ctx) => ctx.html`<p>Dear ${'Ada'},
        welcome  aboard.</p>`,
    );
    expect(out).toBe('<p>Dear Ada, welcome  aboard.</p>');
  });

  it('drops the line between two values, but keeps a space between words and values', () => {
    expect(html((ctx) => ctx.html`<p>${'a'}\n  ${'b'}</p>`)).toBe('<p>ab</p>');
    expect(html((ctx) => ctx.html`<p>Hi\n  ${'b'} there</p>`)).toBe('<p>Hi b there</p>');
  });
});

describe('ctx.columns', () => {
  it('lays cells side by side in equal shares that stack on a phone', () => {
    const out = html((ctx) => ctx.columns(['A', 'B', 'C']));
    expect(out).toBe(
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
        '<td class="bl-stack bl-space" width="33%" valign="top" style="padding:0;">A</td>' +
        '<td class="bl-gap" width="16" style="width:16px;font-size:0;line-height:0;">&nbsp;</td>' +
        '<td class="bl-stack bl-space" width="33%" valign="top" style="padding:0;">B</td>' +
        '<td class="bl-gap" width="16" style="width:16px;font-size:0;line-height:0;">&nbsp;</td>' +
        '<td class="bl-stack" width="33%" valign="top" style="padding:0;">C</td></tr></table>',
    );
  });

  it('takes shares, a gap, an alignment and when to stack', () => {
    const narrow = html((ctx) =>
      ctx.columns(['A', 'B'], { widths: [30, 70], gap: 24, stack: 'narrow', valign: 'middle' }),
    );
    expect(narrow).toContain('class="bl-stack-xs bl-space-xs" width="30%" valign="middle"');
    expect(narrow).toContain('width="24" style="width:24px;');
    expect(narrow).toContain('class="bl-stack-xs" width="70%"');
    const fixed = html((ctx) => ctx.columns(['A', 'B'], { stack: 'never', gap: 0 }));
    expect(fixed).not.toContain('class=');
    expect(fixed).not.toContain('&nbsp;');
    expect(html((ctx) => ctx.columns([]))).toBe('');
  });

  it('goes into ctx.html as it is, and sizes its images with columnWidth', () => {
    const out = html((ctx) => ctx.html`${ctx.columns([ctx.html`<b>${'x'}</b>`])}`);
    expect(out).toContain('<b>x</b>');
    expect(html((ctx) => String(ctx.columnWidth(2)))).toBe('260');
    expect(html((ctx) => String(ctx.columnWidth(3, 20)))).toBe('165');
  });
});

describe('ctx.card', () => {
  it('draws a soft box with a hairline border by default, or as asked', () => {
    expect(html((ctx) => ctx.card('x'))).toMatch(
      /<td style="padding:16px 18px;background:#[0-9a-f]{6};border:1px solid #[0-9a-f]{6};border-radius:8px;">x<\/td>/,
    );
    expect(
      html((ctx) =>
        ctx.card('x', { background: '#ffffff', border: false, padding: '8px', radius: 0 }),
      ),
    ).toContain('<td style="padding:8px;background:#ffffff;border-radius:0px;">x</td>');
  });
});

describe('ctx.richText', () => {
  it('cleans the HTML, resolves its links and gives its plain text', () => {
    const { html: out, text } = (() => {
      let result = { html: '', text: [] as string[] };
      html(
        (ctx) => {
          result = ctx.richText(
            '<p onclick="x()">See <a href="/events">events</a></p><script>bad()</script>',
          );
          return '';
        },
        { baseUrl: BASE_URL },
      );
      return result;
    })();
    expect(out).not.toMatch(/onclick|<script/);
    expect(out).toContain(`href="${BASE_URL}/events"`);
    expect(out).toMatch(/^<div style="font-family:/);
    expect(text).toEqual([`See events (${BASE_URL}/events)`]);
  });

  it('draws nothing for empty text', () => {
    expect(html((ctx) => ctx.richText('').html)).toBe('');
  });
});

describe('a block written with ctx.html', () => {
  it('renders like any other, its fields escaped', () => {
    const job = defineBlock({
      type: 'job',
      label: 'Job',
      description: '',
      group: 'content',
      fields: {
        title: field.text({ default: '<Designer>' }),
        url: field.url({ default: 'javascript:alert(1)' }),
      },
      render: (block, ctx) =>
        ctx.section(
          block,
          ctx.html`
            ${ctx.heading(block.title)}
            <p><a href="${block.url}">${block.title}</a></p>
          `,
        ),
    });
    const definitions = [...builtInBlocks, job];
    const doc = createDocument({
      subject: 'Jobs',
      blocks: [{ ...job.create(), id: 'j', type: 'job', hidden: false }],
    });
    const out = renderEmail(doc, { definitions, baseUrl: BASE_URL }).html;
    expect(out).toContain(
      '&lt;Designer&gt;</h2><p><a href="https://example.test">&lt;Designer&gt;</a></p>',
    );
  });
});

describe('ctx.html on long input', () => {
  it('takes about linear time, however long the values are', () => {
    const long = 'x '.repeat(100_000);
    const start = performance.now();
    const out = html(
      (ctx) =>
        ctx.html`<a title="${long}" href="${'/a'}" data-x=${long}>${long}${ctx.raw('<b>')}${long}</a>`,
    );
    expect(performance.now() - start).toBeLessThan(1500);
    expect(out.length).toBeGreaterThan(800_000);
  });
});
