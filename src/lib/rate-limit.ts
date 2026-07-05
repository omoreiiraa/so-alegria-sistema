import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;

/**
 * Rate limiter para rotas de autenticação: 5 tentativas por minuto por IP.
 * Se as variáveis do Upstash não estiverem configuradas, retorna null e o
 * middleware simplesmente não aplica limite (degradação graciosa).
 */
export function getAuthRateLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: false,
    prefix: "soalegria:auth",
  });
  return limiter;
}

/** Extrai o IP do cliente dos headers (Vercel usa x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "anon";
}
