import { describe, expect, it } from 'vitest';

import { clerkAuthorizedParties, protectedSignInUrl } from './env';

describe('Clerk authorized parties', () => {
  it('normalizes a configured HTTPS application origin', () => {
    expect(clerkAuthorizedParties('https://devvault.example')).toEqual(['https://devvault.example']);
  });

  it('allows localhost for local development', () => {
    expect(clerkAuthorizedParties('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it.each(['', 'http://devvault.example', 'https://devvault.example/path', 'not-a-url'])(
    'fails closed for an unsafe origin: %s',
    (value) => expect(clerkAuthorizedParties(value)).toEqual(['https://invalid.devvault.local']),
  );
});

describe('protected sign-in redirects', () => {
  it('keeps protected RSC navigation on the request origin', () => {
    expect(protectedSignInUrl('https://devvault.example/dashboard?tab=recent')).toBe(
      'https://devvault.example/sign-in?redirect_url=https%3A%2F%2Fdevvault.example%2Fdashboard%3Ftab%3Drecent',
    );
  });

  it('does not substitute a configured or external Clerk origin', () => {
    expect(protectedSignInUrl('https://deployment.example/dashboard/practice')).toMatch(
      /^https:\/\/deployment\.example\/sign-in\?/,
    );
  });
});
