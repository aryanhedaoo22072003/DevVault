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
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('redirect_url', request.url);
        await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
      }
    }, {
      authorizedParties: clerkAuthorizedParties(),
      signInUrl: '/sign-in',
      signUpUrl: '/sign-up',
    })
  : fallbackProxy;

export const config = {
  matcher: ['/((?\!_next|.*\\..*|favicon.ico).*)'],
};
