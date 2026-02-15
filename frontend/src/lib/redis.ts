import { Redis } from '@upstash/redis'

let cachedRedis: Redis | null = null

/** Singleton Redis client — reuses connection across API route invocations */
export function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  cachedRedis = new Redis({ url, token })
  return cachedRedis
}
