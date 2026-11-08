/** Explicit browser-origin allowlist. Loopback aliases apply only in local development. */
export function resolveCorsOrigins(configured: string | undefined, environment: string | undefined): string[] {
  const origins = (configured || 'http://localhost:5173')
    .split(',').map(value => value.trim()).filter(Boolean);
  const unique = new Set(origins);
  if (environment !== 'production') {
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== 'http:' || parsed.port !== '5173' || parsed.pathname !== '/' || parsed.search || parsed.hash) continue;
        if (parsed.hostname === 'localhost') unique.add('http://127.0.0.1:5173');
        if (parsed.hostname === '127.0.0.1') unique.add('http://localhost:5173');
      } catch { /* Invalid entries do not authorize any additional origin. */ }
    }
  }
  return [...unique];
}
