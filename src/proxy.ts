import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { clerkAuthorizedParties, hasClerkConfig } from '@/lib/env';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

const fallbackProxy = (request: NextRequest) => {
  return NextResponse.next();
};

export default hasClerkConfig
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
    }, { authorizedParties: clerkAuthorizedParties() })
  : fallbackProxy;

export const config = {
  matcher: ['/((?\!_next|.*\\..*|favicon.ico).*)'],
};
