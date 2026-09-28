import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let client: Redis | null = null;

if (url && token) {
  client = new Redis({ url, token });
}

export function getRedis(): Redis | null {
  return client;
}

let warned = false;

/** Logs a Redis failure only once per process. A dead instance would otherwise
 *  print the same stack trace on every request while each call site already
 *  falls back to in-memory/Mongo cleanly. */
export function reportRedisError(context: string, err: unknown): void {
  if (warned) return;
  warned = true;
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`[redis] ${context}: ${reason} — running without shared cache until Redis is reachable again.`);
}
