import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if keys are set and not placeholder values
export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  Boolean(supabaseAnonKey) && 
  !supabaseUrl.includes("your-project-id") &&
  !supabaseUrl.includes("your_supabase_project_url") &&
  !supabaseAnonKey.includes("your-anon-public-key") &&
  !supabaseAnonKey.includes("your_supabase_anon_key");

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
