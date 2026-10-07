import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * The page's table of contents, held under the top of the viewport. It follows the reader: the
 * section on screen is marked as the current location, and one indicator slides beneath it. That
 * slide is the page's only motion, and reduced-motion users get the mark without the movement.
 */
export function SectionNav({ sections }: { sections: readonly NavSection[] }) {
  const [current, setCurrent] = useState(sections[0]?.id ?? '');
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        const first = visible[0];
        if (first) setCurrent(first.target.id);
      },
      // A section is "current" once its top passes the band just below the nav.
      { rootMargin: '-96px 0px -55% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  useLayoutEffect(() => {
    const link = links.current.get(current);
    if (!link) return;
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
