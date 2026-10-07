import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
}

/**
 * A tab set with the keyboard behaviour the pattern promises: arrow keys move between tabs,
 * Home and End jump to the ends, and only the selected tab is in the tab order.
 */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const [selected, setSelected] = useState(items[0]?.id ?? '');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const select = (index: number) => {
    const item = items[(index + items.length) % items.length];
    if (!item) return;
    setSelected(item.id);
    tabs.current[(index + items.length) % items.length]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div className="pg-tabs">
      <div role="tablist" aria-label={label} className="pg-tabs__list">
        {items.map((item, index) => {
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              className="pg-tabs__tab"
              onClick={() => setSelected(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          hidden={item.id !== selected}
          className="pg-tabs__panel"
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
