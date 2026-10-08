import editorPackage from '@subterra-technologies/blockletter-react/package.json';
import type { View } from '../route';
import { SUBTERRA_SITE_URL } from '../sample/subterra';

const REPOSITORY_URL = 'https://github.com/Subterra-Technologies/blockletter';
const NPM_URL = 'https://www.npmjs.com/package/@subterra-technologies/blockletter-react';

/** GitHub's mark, from Octicons (MIT). */
function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

/** The demo's own bar: what it is, who made it, its two views and its source. */
export function TopBar({ view }: { view: View }) {
  return (
    <header className="pg-bar">
      <div className="pg-bar__inner">
        <p className="pg-brand">
          <span className="pg-brand__name">Blockletter</span>
          <a className="pg-brand__by" href={SUBTERRA_SITE_URL}>
            by Subterra Technologies
          </a>
        </p>
        <nav className="pg-views" aria-label="Views">
          <ul className="pg-views__list">
            <li>
              <a
                className="pg-views__link"
                href="#editor"
                aria-current={view === 'editor' ? 'page' : undefined}
              >
                Editor
              </a>
            </li>
            <li>
              <a
                className="pg-views__link"
                href="#docs"
                aria-current={view === 'docs' ? 'page' : undefined}
              >
                Docs
              </a>
            </li>
          </ul>
        </nav>
        <div className="pg-bar__end">
          {/* The version the demo was built with, read from the package so it never goes stale. */}
          <a className="pg-bar__note" href={NPM_URL}>
            v{editorPackage.version} on npm
          </a>
          <a className="pg-bar__source" href={REPOSITORY_URL}>
            <GitHubMark />
            <span className="pg-bar__source-label">
              <span className="pg-visually-hidden">Source on </span>GitHub
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
