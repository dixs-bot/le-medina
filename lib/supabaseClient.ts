import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder-project.supabase.co' &&
  !supabaseUrl.includes('example.com') &&
  !supabaseUrl.includes('your-project.supabase.co')
);

// Public / Anon client (respects RLS)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

// Server-side privileged Admin client (service_role key, bypasses RLS for internal server handlers)
export const isSupabaseAdminConfigured = Boolean(
  isSupabaseConfigured &&
  supabaseServiceRoleKey &&
  supabaseServiceRoleKey !== 'your-service-role-key-here'
);

export const supabaseAdmin: SupabaseClient | null = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null; // Never use the public client for privileged server operations
