'use client';

import { useState } from 'react';

export function SecureDownloadButton({ assetId, title }: { assetId: string; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setError(null);
    setDownloading(true);
    try {
      const response = await fetch(`/api/downloads/${encodeURIComponent(assetId)}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'The download could not be started.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || title;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The download could not be started.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={download} disabled={downloading} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
        {downloading ? 'Preparing…' : `Download ${title}`}
      </button>
      {error ? <p role="alert" className="mt-2 max-w-xs text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
