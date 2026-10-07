import { useMemo } from 'react';
import { contrastRatio, resolvePalette, type BrandKit } from '@subterra-technologies/blockletter';
import { CodeBlock } from '../components/code-block';

/** The palette roles worth showing, each with the colour it is read against. */
const ROLES = [
  { key: 'text', label: 'Text', on: 'card', use: 'Body copy and headings' },
  { key: 'accent', label: 'Accent', on: 'card', use: 'Button fills and rules' },
  {
    key: 'accentInk',
    label: 'Accent as text',
    on: 'card',
    use: 'Kickers, figures, outline buttons',
  },
  { key: 'accentText', label: 'Button label', on: 'accent', use: 'Text on the accent' },
  { key: 'tileDay', label: 'Highlight', on: 'band', use: 'Event-tile day numbers' },
  { key: 'bandText', label: 'Band text', on: 'band', use: 'Text on the dark bands' },
] as const;

export function Brand({ brand, onEdit }: { brand: BrandKit; onEdit: () => void }) {
  const palette = useMemo(() => resolvePalette(brand), [brand]);
  const shown = useMemo(() => {
    const { name, colors, fonts, contact } = brand;
    return JSON.stringify({ name, colors, fonts, contact }, null, 2);
  }, [brand]);

  return (
    <section id="brand-kit" className="pg-section" aria-labelledby="brand-kit-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="brand-kit-heading">Brand kit</h2>
          <p>
            One <code>BrandKit</code> per organisation: a name and logo, four colours, two web-safe
            fonts, contact details and social links. Every block reads it at render time, so one
            edit restyles every issue that has not overridden it.
          </p>
          <p>
            The renderer derives the email&rsquo;s whole palette from those four colours and checks
            each pair it will actually print. A light accent stays the fill of a button but is
            darkened, keeping its hue, wherever it is used as text.
          </p>
          <p>
            <button type="button" className="pg-button" onClick={onEdit}>
              Edit the brand kit in the editor
            </button>
          </p>
          <CodeBlock title="The brand kit in use (live)" code={shown} />
        </div>

        <div className="pg-panel" role="group" aria-labelledby="palette-heading">
          <div className="pg-panel__head">
            <h3 id="palette-heading">The palette the renderer derives</h3>
            <p className="pg-muted">
              WCAG AA asks 4.5:1 for text, 3:1 for large text like the day numbers.
            </p>
          </div>
          <table className="pg-palette">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Colour</th>
                <th scope="col">Contrast</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => {
                const color = palette[role.key];
                const ground = palette[role.on];
                return (
                  <tr key={role.key}>
                    <th scope="row">
                      {role.label}
                      <span className="pg-palette__use">{role.use}</span>
                    </th>
                    <td>
                      <span className="pg-palette__chip">
                        <span
                          aria-hidden="true"
                          className="pg-palette__swatch"
                          style={{ background: ground, color }}
                        >
                          Aa
                        </span>
                        <code>{color}</code>
                      </span>
                    </td>
                    <td className="pg-palette__ratio">
                      {contrastRatio(color, ground).toFixed(1)}:1
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
