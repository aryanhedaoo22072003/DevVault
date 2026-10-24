import { SignIn } from '@clerk/nextjs';

import { hasClerkConfig } from '@/lib/env';
import { Navbar } from '@/components/navbar';

export default function SignInPage() {
  if (!hasClerkConfig) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6">
        <div className="max-w-lg rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Auth pending</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Clerk sign-in is not configured yet.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Add the Clerk publishable and secret keys to the environment to enable authentication.
          </p>
        </div>
      </div></main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950"><Navbar /><div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6 py-10">
      <SignIn appearance={{ variables: { colorPrimary: 'var(--brand)', colorBackground: 'var(--surface)', colorForeground: 'var(--foreground)', borderRadius: '1rem' } }} />
    </div>
    </main>
  );
}
