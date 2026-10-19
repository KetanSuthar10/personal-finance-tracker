import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfigValidation {
  isValid: boolean;
  error?: string;
  url?: string;
  key?: string;
}

export function validateSupabaseConfig(rawUrl?: string, rawKey?: string): SupabaseConfigValidation {
  if (!rawUrl || !rawKey) {
    return {
      isValid: false,
      error: 'Supabase URL and Key are not configured in environment variables.',
    };
  }

  const url = rawUrl.trim();
  const key = rawKey.trim();

  if (!url.startsWith('https://')) {
    return {
      isValid: false,
      error: 'Supabase URL must use HTTPS.',
    };
  }

  if (url.includes('your-project') || url.includes('placeholder-unconfigured')) {
    return {
      isValid: false,
      error: 'Supabase URL contains a placeholder value. Please supply your real project URL.',
    };
  }

  if (key.length < 10 || key.includes('your-publishable') || key.includes('placeholder')) {
    return {
      isValid: false,
      error: 'Supabase Key contains a placeholder value. Please supply your real publishable/anon key.',
    };
  }

  return {
    isValid: true,
    url,
    key,
  };
}

// Canonical variable is VITE_SUPABASE_PUBLISHABLE_KEY; fallback to VITE_SUPABASE_ANON_KEY for compatibility
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigValidation = validateSupabaseConfig(envUrl, envKey);
export const isSupabaseConfigured = supabaseConfigValidation.isValid;

// When configured, instantiate client with verified credentials.
// When unconfigured, provide a non-throwing stub client with safe mock values to prevent module evaluation crashes.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured && supabaseConfigValidation.url ? supabaseConfigValidation.url : 'https://placeholder-unconfigured.supabase.co',
  isSupabaseConfigured && supabaseConfigValidation.key ? supabaseConfigValidation.key : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

