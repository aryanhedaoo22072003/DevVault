import { AdminHeader } from '@/components/admin-ui';
import { env, hasClerkConfig, hasMongoConfig } from '@/lib/env';
import { s3Configuration } from '@/lib/private-storage';

export default function AdminSettingsPage() {
  let storageReady = env.storageProvider === 'local-private' && Boolean(env.privateStorageRoot);
  if (env.storageProvider === 's3-private') { try { s3Configuration(); storageReady = true; } catch { storageReady = false; } }
  const checks = [{ label: 'MongoDB', ready: hasMongoConfig }, { label: 'Clerk authentication', ready: hasClerkConfig }, { label: 'Stripe test key', ready: env.stripeSecretKey.startsWith('sk_test_') }, { label: 'Stripe test publishable key', ready: env.stripePublishableKey.startsWith('pk_test_') }, { label: `Private asset storage (${env.storageProvider === 's3-private' ? 'S3-compatible' : 'local development'})`, ready: storageReady }];
  return <><AdminHeader eyebrow="Safe configuration" title="Settings" description="Read-only readiness indicators. Secret values and private paths are never rendered in the browser." /><section className="max-w-3xl rounded-3xl border border-white/10 bg-slate-900/60 p-6"><h2 className="font-semibold text-white">Service readiness</h2><div className="mt-5 divide-y divide-white/10">{checks.map((item) => <div key={item.label} className="flex items-center justify-between py-4"><span className="text-sm text-slate-300">{item.label}</span><span className={`rounded-full px-3 py-1 text-xs ${item.ready ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>{item.ready ? 'Configured' : 'Needs configuration'}</span></div>)}</div><div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><strong>Stripe test mode only.</strong> Live keys are rejected by the payment runtime. This page does not expose or update credentials.</div></section></>;
}
