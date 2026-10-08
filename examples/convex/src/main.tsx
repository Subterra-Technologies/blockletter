import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The editor's stylesheet first, so the app's own rules after it win any tie with its scoped reset.
import '@subterra-technologies/blockletter-react/styles.css';
import './styles.css';
import { App } from './app';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element.');

// `npx convex dev` writes the deployment's address to .env.local.
const url: string | undefined = import.meta.env.VITE_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

createRoot(root).render(
  <StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <main className="page">
        <h1>Connect a Convex deployment</h1>
        <p>
          Run <code>npx convex dev</code> in this folder first. It creates a deployment, pushes the
          functions in <code>convex/</code> and writes <code>VITE_CONVEX_URL</code> to{' '}
          <code>.env.local</code>; then restart <code>npm run dev</code>.
        </p>
      </main>
    )}
  </StrictMode>,
);
