/** Parse REDIS_URL for BullMQ / ioredis connection options. */
export function bullmqConnectionFromEnv(): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: number | null;
  connectTimeout: number;
  enableOfflineQueue: boolean;
} {
  const defaults = {
    // BullMQ workers need null; producers still benefit from short connect timeout.
    maxRetriesPerRequest: null as number | null,
    connectTimeout: 5_000,
    enableOfflineQueue: false,
  };

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return { host: "127.0.0.1", port: 6379, ...defaults };
  }

  try {
    const parsed = new URL(url);
    const port = parsed.port ? Number(parsed.port) : 6379;
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number.isFinite(port) ? port : 6379,
      ...(parsed.username
        ? { username: decodeURIComponent(parsed.username) }
        : {}),
      ...(parsed.password
        ? { password: decodeURIComponent(parsed.password) }
        : {}),
      ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
      ...defaults,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379, ...defaults };
  }
}
