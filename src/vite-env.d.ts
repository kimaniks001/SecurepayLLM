/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECUREPAY_MODE?: 'real' | 'fixture';
  readonly VITE_SECUREPAY_API_BASE_URL?: string;
  /** Explicitly opts this build into serving the isolated sandbox through www.securepay.ke. */
  readonly VITE_SECUREPAY_PUBLIC_STAGING_HOST?: string;
}
