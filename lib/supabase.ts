import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Browser client — used in all client components and hooks
// Env vars must be set in Vercel project settings (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export { supabaseUrl, supabaseAnonKey };
