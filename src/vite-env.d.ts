/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECUREPAY_MODE?: 'real' | 'fixture';
  readonly VITE_SECUREPAY_API_BASE_URL?: string;
  readonly VITE_SECUREPAY_OWNER_TESTING_ORIGIN?: string;
}
