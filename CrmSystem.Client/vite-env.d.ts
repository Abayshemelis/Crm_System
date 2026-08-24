/// <reference types="vite/client" />
interface ImportMetaEnv {
  VITE_API_BASE?: string;
  VITE_API_DEBUG?: string;
  // Add other VITE_ env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
