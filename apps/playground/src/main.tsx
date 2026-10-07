import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@subterra-technologies/blockletter-react/styles.css';
import './playground.css';
import { App } from './app';
import { readDeepLink } from './deep-link';
import { renderEmailPage } from './render-page';

const link = readDeepLink();

// The app restores the docs' scroll itself: the browser would try before the docs are shown.
history.scrollRestoration = 'manual';

if (link.render) {
  // Just the email, as an inbox shows it: no editor, no playground around it.
  void renderEmailPage(link.render, link.org);
} else {
  const root = document.getElementById('root');
  if (!root) throw new Error('The page has no #root element.');
  createRoot(root).render(
    <StrictMode>
      <App link={link} />
    </StrictMode>,
  );
}
