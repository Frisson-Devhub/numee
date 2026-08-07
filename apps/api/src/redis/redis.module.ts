import { Global, Injectable, Module } from "@nestjs/common";
import { Redis } from "@upstash/redis";

/** Upstash Redis REST wrapper for OTP/signup staging keys. */
@Injectable()
export class RedisService {
  readonly client: Redis;

  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  /** Read a JSON value by key. */
  get<T>(key: string) {
    return this.client.get<T>(key);
  }

  /** Write a value with optional TTL or keepTtl. */
  set(key: string, value: unknown, opts?: { ex?: number; keepTtl?: boolean }) {
    if (opts?.keepTtl) {
      return this.client.set(key, value, { keepTtl: true });
    }
    if (opts?.ex != null) {
      return this.client.set(key, value, { ex: opts.ex });
    }
    return this.client.set(key, value);
  }

  /** Delete a key. */
  del(key: string) {
    return this.client.del(key);
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
