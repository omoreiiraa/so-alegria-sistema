import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Client Supabase para Client Components (usa a chave publishable, respeita RLS). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
