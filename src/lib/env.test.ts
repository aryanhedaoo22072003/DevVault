import { describe, expect, it } from 'vitest';

import { clerkAuthorizedParties } from './env';

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
