import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function envTrim(name: string): string | undefined {
  const v = process.env[name]
  return v?.trim() || undefined
}

let supabaseSingleton: SupabaseClient | null = null
let supabaseAdminSingleton: SupabaseClient | null = null

function getSupabaseAnon(): SupabaseClient {
  if (supabaseSingleton) return supabaseSingleton
  const url = envTrim("NEXT_PUBLIC_SUPABASE_URL")
  const key = envTrim("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!url || !key) {
    throw new Error(
      "Supabase: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }
  supabaseSingleton = createClient(url, key)
  return supabaseSingleton
}

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminSingleton) return supabaseAdminSingleton
  const url = envTrim("NEXT_PUBLIC_SUPABASE_URL")
  const key = envTrim("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) {
    throw new Error(
      "Supabase: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    )
  }
  supabaseAdminSingleton = createClient(url, key)
  return supabaseAdminSingleton
}

function lazyClientProxy(factory: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop, _receiver) {
      const client = factory()
      const value = Reflect.get(client as object, prop, client) as unknown
      if (typeof value === "function") {
        return (value as (...args: unknown[]) => unknown).bind(client)
      }
      return value
    },
  })
}

/** Browser/client-side client — uses anon key, respects RLS. */
export const supabase = lazyClientProxy(getSupabaseAnon)

/**
 * Server-side admin client — uses service role key, bypasses RLS.
 * Never expose to the browser.
 */
export const supabaseAdmin = lazyClientProxy(getSupabaseAdminClient)
