import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client com service role — FURA a RLS. Use apenas no servidor (Server Actions /
 * Edge Functions), nunca no client. Requer SUPABASE_SERVICE_ROLE_KEY.
 * Preferir sempre os RPCs SECURITY DEFINER; use este client só quando for
 * estritamente necessário operar acima da RLS.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor.");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
