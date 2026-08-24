/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_API_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
