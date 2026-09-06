/**
 * Environment configuration, read once at startup.
 *
 * Every value a service needs to reach another service is required. The previous
 * setup defaulted the database host to "localhost" and the engine to MySQL when
 * unset, which turned a missing variable into a connection error on :3306 at
 * request time instead of a clear failure at boot.
 */

/** Reads a required variable, or exits naming it. */
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing required environment variable ${name}. See .env.example.`
    );
    process.exit(1);
  }
  return value;
};

export const env = {
  databaseUrl: required("DATABASE_URL"),
  port: Number(process.env.PORT ?? 3000),

  /**
   * Comma-separated origin allowlist. The previous server sent
   * Access-Control-Allow-Origin: * to every caller.
   */
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  /** Serve the built frontend bundle from this directory. Unset in development. */
  staticDir: process.env.STATIC_DIR,

  /** Seconds a cached GET response stays fresh. */
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 300),
} as const;
