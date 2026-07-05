import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAuthRateLimiter, clientIp } from "@/lib/rate-limit";

// Rotas de autenticação protegidas por rate limit (apenas POST — os envios).
const AUTH_POST_PATHS = new Set([
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
]);

export async function middleware(request: NextRequest) {
  if (request.method === "POST" && AUTH_POST_PATHS.has(request.nextUrl.pathname)) {
    const limiter = getAuthRateLimiter();
    if (limiter) {
      const { success } = await limiter.limit(`auth:${clientIp(request.headers)}`);
      if (!success) {
        return new NextResponse(
          "Muitas tentativas. Aguarde um minuto e tente novamente.",
          { status: 429 },
        );
      }
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
