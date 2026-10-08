import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
// The editor's stylesheet first, so the app's own rules after it win any tie with its scoped reset.
import '@subterra-technologies/blockletter-react/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Newsletter drafts · Fernhill Tool Library',
    template: '%s · Fernhill Tool Library',
  },
  description: 'A Blockletter example: newsletter drafts in a Next.js App Router app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="app-header">
          <Link href="/" className="app-title">
            Fernhill Tool Library <span className="app-title__part">newsletter</span>
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
