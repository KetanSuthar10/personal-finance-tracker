import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

// Fallback dummy URL and key to prevent createClient throwing during build or testing without env
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://mpjjetxtpekrxeyivlkv.supabase.co';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'dummy-anon-key';

export const supabase: SupabaseClient = createClient(
  effectiveUrl,
  effectiveKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
