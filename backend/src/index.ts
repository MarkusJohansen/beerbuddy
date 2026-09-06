import { app } from "./app.ts";
import { env } from "./env.ts";

export default {
  port: env.port,
  fetch: app.fetch,
};

console.log(`BeerBuddy API listening on :${env.port}`);
