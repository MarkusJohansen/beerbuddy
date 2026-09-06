/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the API: http://localhost:3000/api in development, and /api in the
   * production image, where the backend serves this bundle from the same origin.
   *
   * Typed as a required string because vite.config.ts fails the build when it is
   * unset, so there is no runtime path where it is undefined. The old setup had no
   * such check and shipped a bundle that called fetch(undefined).
   */
  readonly VITE_APP_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
