/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OLA_MAPS_API_KEY?: string;
  readonly VITE_MAPPLS_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
