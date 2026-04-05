// ─────────────────────────────────────────────
// NGN Fishing — Supabase Client (lazy init)
// Lazy-initialized to avoid SSR/static-export
// crashes where `window` / AsyncStorage are
// not available at module-evaluation time.
// ─────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://dauvjyaqbjaatrvurfex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXZqeWFxYmphYXRydnVyZmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTc2NzYsImV4cCI6MjA5MDk5MzY3Nn0.r86ThryNE2w7_tR1ylKCyf8F2vFf1gw9Tgq5e_EvBdA';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

// Proxy that lazily initializes on first property access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
