/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_USE_API_PROXY?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_DEFAULT_SOCIETY_ID?: string;
  readonly VITE_MOCK_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
