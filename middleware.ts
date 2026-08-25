import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAuthRateLimiter, getLinkRateLimiter, clientIp } from "@/lib/rate-limit";

// Rotas de autenticação protegidas por rate limit (apenas POST — os envios).
const AUTH_POST_PATHS = new Set(["/login", "/esqueci-senha", "/redefinir-senha"]);

/** Rotas abertas por token: limitadas em GET e POST, contra varredura. */
const LINK_PATH = /^\/(cadastro|convite)\//;

const DEMASIADO = "Muitas tentativas. Aguarde um minuto e tente novamente.";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = clientIp(request.headers);

  if (request.method === "POST" && AUTH_POST_PATHS.has(pathname)) {
    const limiter = getAuthRateLimiter();
    if (limiter) {
      const { success } = await limiter.limit(`auth:${ip}`);
      if (!success) return new NextResponse(DEMASIADO, { status: 429 });
    }
  }

  if (LINK_PATH.test(pathname)) {
    const limiter = getLinkRateLimiter();
    if (limiter) {
      const { success } = await limiter.limit(`link:${ip}`);
      if (!success) return new NextResponse(DEMASIADO, { status: 429 });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas as rotas, exceto:
     * - _next/static, _next/image
     * - favicon, ícones, manifest
     * - arquivos com extensão (imagens, fontes)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
