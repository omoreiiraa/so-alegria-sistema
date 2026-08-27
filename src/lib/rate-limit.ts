import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;
let linkLimiter: Ratelimit | null | undefined;

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Rate limiter para rotas de autenticação: 5 tentativas por minuto por IP.
 * Se as variáveis do Upstash não estiverem configuradas, retorna null e o
 * middleware simplesmente não aplica limite (degradação graciosa).
 */
export function getAuthRateLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const redis = redisFromEnv();
  if (!redis) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: false,
    prefix: "soalegria:auth",
  });
  return limiter;
}

/**
 * Rate limiter das rotas públicas de link tokenizado: 20 requisições por minuto
 * por IP. O token tem 256 bits e é impossível de adivinhar, mas o limite fecha a
 * porta para varredura e mantém a rota barata sob carga.
 */
export function getLinkRateLimiter(): Ratelimit | null {
  if (linkLimiter !== undefined) return linkLimiter;
  const redis = redisFromEnv();
  if (!redis) {
    linkLimiter = null;
    return null;
  }
  linkLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    analytics: false,
    prefix: "soalegria:link",
  });
  return linkLimiter;
}

/** Extrai o IP do cliente dos headers (Vercel usa x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "anon";
}
