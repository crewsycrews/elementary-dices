/// <reference types="vite/client" />

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.avif" {
  const src: string;
  export default src;
}
