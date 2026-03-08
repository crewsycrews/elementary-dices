/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.avif" {
  const src: string;
  export default src;
}
