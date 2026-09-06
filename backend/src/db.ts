import { SQL } from "bun";
import { env } from "./env.ts";

/**
 * The one database handle.
 *
 * Bun's SQL client binds tagged-template values as parameters, so the short way to
 * write a query is also the safe one. There is no dialect branch here: PostgreSQL
 * is the only engine, in every environment.
 */
export const sql = new SQL(env.databaseUrl);
