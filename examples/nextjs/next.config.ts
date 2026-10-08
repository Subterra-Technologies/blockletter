import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // What `create-next-app` sets up for a new App Router app: data is read at request time unless
  // cached, so the drafts list and the issue page render inside <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
