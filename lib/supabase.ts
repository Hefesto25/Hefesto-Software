import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://hlqftzvwilbwchfqelqy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWZ0enZ3aWxid2NoZnFlbHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTA0MjYsImV4cCI6MjA4NzEyNjQyNn0.oGbHWPzWTCFnnGirGtufldmAy56euYjMgnh85dIbzA8';

// Browser client — used in all client components and hooks
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export { supabaseUrl, supabaseAnonKey };
