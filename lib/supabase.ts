import { createBrowserClient } from '@supabase/ssr';

// Local fallbacks retrieved from .env.local and Supabase MCP
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqftzvwilbwchfqelqy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWZ0enZ3aWxid2NoZnFlbHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTA0MjYsImV4cCI6MjA4NzEyNjQyNn0.oGbHWPzWTCFnnGirGtufldmAy56euYjMgnh85dIbzA8';

// Browser client — used in all client components and hooks
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export { supabaseUrl, supabaseAnonKey };
