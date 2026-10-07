import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * The docs' table of contents, held under the top bar. It follows the reader: the section on
 * screen is marked as the current location, and one indicator slides beneath it. Above the first
 * section nothing is marked. The slide is the docs' only motion, and reduced-motion users get the
 * mark without the movement.
 */
export function SectionNav({ sections }: { sections: readonly NavSection[] }) {
  const [current, setCurrent] = useState('');
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    // The latest word on every section, so leaving them all (back up to the intro) clears the mark.
    const latest = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => latest.set(entry.target.id, entry));
        const visible = [...latest.values()]
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        setCurrent(visible[0]?.target.id ?? '');
      },
      // A section is "current" once its top passes the band just below the two sticky bars.
      { rootMargin: '-120px 0px -55% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  useLayoutEffect(() => {
    const link = links.current.get(current);
    if (!link) {
      setIndicator((shown) => ({ left: shown.left, width: 0 }));
      return;
    }
    setIndicator({ left: link.offsetLeft, width: link.offsetWidth });
    // Keep the current link visible when the list scrolls sideways on a phone.
    const scroller = list.current;
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' });
    }
  }, [current]);

  return (
    <nav className="pg-nav" aria-label="On this page">
      <div className="pg-shell pg-nav__inner">
        <ul className="pg-nav__list" ref={list}>
          {sections.map((section) => (
            <li key={section.id}>
              <a
                ref={(element) => {
                  if (element) links.current.set(section.id, element);
                  else links.current.delete(section.id);
                }}
                href={`#${section.id}`}
                className="pg-nav__link"
                aria-current={current === section.id ? 'location' : undefined}
              >
                {section.label}
              </a>
            </li>
          ))}
          <li
            aria-hidden="true"
            className="pg-nav__indicator"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          />
        </ul>
      </div>
    </nav>
  );
}
