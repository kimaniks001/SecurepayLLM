/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECUREPAY_MODE?: 'real' | 'fixture';
  readonly VITE_SECUREPAY_API_BASE_URL?: string;
  readonly VITE_SECUREPAY_M5_QUOTATIONS?: 'enabled' | 'disabled';
  readonly VITE_SECUREPAY_M6_MONEY_STATUS?: 'enabled' | 'disabled';
  readonly VITE_SECUREPAY_M6_FEE_QUOTES?: 'enabled' | 'disabled';
  readonly VITE_SECUREPAY_M6_PAYMENT_SUBMISSION?: 'enabled' | 'disabled';
}
