/** Each row's keys: chords are joined with "+", alternatives with "or". */
const KEYS = [
  { keys: [['↑'], ['↓']], action: 'Move between blocks on the canvas' },
  { keys: [['Home'], ['End']], action: 'Jump to the first or last block' },
  { keys: [['Enter']], action: 'Edit the focused block in the inspector' },
  {
    keys: [
      ['Alt', '↑'],
      ['Alt', '↓'],
    ],
    action: 'Move the focused block: the keyboard path for dragging',
  },
  { keys: [['Esc']], action: 'Cancel an insertion point set from a block’s toolbar' },
  {
    keys: [
      ['Ctrl', 'B'],
      ['⌘', 'B'],
    ],
    action: 'Bold in a text block’s text; with I, italics, and with K, a link',
  },
  {
    keys: [
      ['Ctrl', 'Z'],
      ['⌘', 'Z'],
    ],
    action: 'Undo the last change to the issue, from anywhere in the editor',
  },
  // The three-key chords are in words: as keys, they would widen this column until every
  // description on a 320px phone wrapped a word to a line.
  { keys: [['Ctrl', 'Y']], action: 'Redo it, as Ctrl + Shift + Z and ⌘ + Shift + Z do' },
] as const;

export function Accessibility() {
  return (
    <section id="accessibility" className="pg-section" aria-labelledby="accessibility-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="accessibility-heading">Accessibility</h2>
          <p>
            The editor is built to WCAG 2.2 AA. Every drag-and-drop gesture has a keyboard path,
            insertions, moves and undos are announced to screen readers, and focus follows the work:
            to the inspector when a block is picked, back to the canvas when a dialog closes.
          </p>
          <p>
            This page goes through an automated accessibility audit at 1440, 768, 390 and 320 pixels
            wide on every change, and nothing on it scrolls sideways on a small phone.
          </p>
        </div>

        <div className="pg-panel" role="group" aria-labelledby="keys-heading">
          <div className="pg-panel__head">
            <h3 id="keys-heading">Keys in the editor</h3>
          </div>
          <table className="pg-keys">
            <thead>
              <tr>
                <th scope="col">Keys</th>
                <th scope="col">Does</th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map((row) => (
                <tr key={row.action}>
                  <td>
                    {row.keys.map((chord, index) => (
                      <span key={chord.join('+')}>
                        {index > 0 ? ' or ' : null}
                        <span className="pg-chord">
                          {chord.map((key, position) => (
                            <span key={key}>
                              {position > 0 ? ' + ' : null}
                              <kbd>{key}</kbd>
                            </span>
                          ))}
                        </span>
                      </span>
                    ))}
                  </td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
