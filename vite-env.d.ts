// vite-env.d.ts
/// <reference types="vite/client" />

declare module '*.txt' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_METABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
