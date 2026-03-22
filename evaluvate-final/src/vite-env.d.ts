/// <reference types="vite/client" />

/**
 * Type declarations for all VITE_ environment variables.
 * If you add a new VITE_ variable, add it here too so TypeScript knows about it.
 * All values are strings (Vite injects them as strings at build time).
 */
interface ImportMetaEnv {
  // Backend API base URL
  readonly VITE_API_BASE_URL: string;

  // Feature flags — "true" | "false" strings
  readonly VITE_FEATURE_REAL_UPLOAD: string;
  readonly VITE_FEATURE_REAL_SCORING: string;
  readonly VITE_FEATURE_REAL_AUTH: string;

  // POC school scope
  readonly VITE_POC_SCHOOL_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

