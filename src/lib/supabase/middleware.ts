import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import type { UserRole } from "@/types/domain";
import { eEquipe, ROTA_INICIAL } from "@/types/domain";

/**
 * Renova a sessão em cada request e protege /admin — a área do escritório.
 * As rotas públicas de token (/cadastro/*, /convite/*) passam livres; quem valida
 * é o RPC no banco. A checagem de role ocorre nos layouts (server components).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() revalida o token e mantém a sessão fresca.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Já logado, não precisa ver o login de novo.
  // Sessão sem papel de escritório (conta antiga de colaborador) fica no login:
  // mandá-la ao /admin só devolveria ela para cá, em laço.
  if (user && pathname === "/login") {
    const role = user.app_metadata?.role as UserRole | undefined;
    if (role && eEquipe(role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROTA_INICIAL;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
