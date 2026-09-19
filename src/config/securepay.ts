export type RuntimeMode = 'real' | 'fixture';

export function runtimeMode(value: string | undefined, production: boolean): RuntimeMode {
  if (value !== undefined && value !== 'real' && value !== 'fixture') throw new Error('Invalid SecurePay mode');
  if (production && value === 'fixture') throw new Error('Fixtures are disabled in production');
  return value === 'fixture' ? 'fixture' : 'real';
}

export function apiBaseUrl(value: string | undefined): string {
  if (!value) throw new Error('VITE_SECUREPAY_API_BASE_URL is required');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('SecurePay API requires HTTPS');
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid SecurePay API URL');
  return url.href.replace(/\/$/, '');
}
