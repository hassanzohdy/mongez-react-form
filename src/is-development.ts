// Declared locally: the package does not depend on @types/node.
declare const process: { env: Record<string, string | undefined> };

/**
 * Whether development-only warnings should be logged.
 *
 * `process.env.NODE_ENV` is written literally on purpose: bundlers (Vite,
 * webpack, esbuild) replace that exact expression at build time, so a browser
 * production build sees `"production"` even though `process` does not exist
 * there. Reading it through `globalThis.process?.env` would bypass the
 * replacement and log in production. Without a bundler and without `process`,
 * this falls back to logging.
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}
