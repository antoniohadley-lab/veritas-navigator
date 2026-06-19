import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client-side Supabase instance (safe — uses anon key)
export const supabase =
  url && anonKey && !url.includes("REPLACE_ME")
    ? createClient(url, anonKey)
    : null;

// Server-side Supabase instance (uses service role — only in API routes)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes("REPLACE_ME") || serviceKey.includes("REPLACE_ME")) {
    return null;
  }
  return createClient(url, serviceKey);
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string | null; phone: string | null; email: string | null; county: string | null; created_at: string };
        Insert: { id?: string; name?: string; phone?: string; email?: string; county?: string };
        Update: { name?: string; phone?: string; email?: string; county?: string };
      };
      cases: {
        Row: { id: string; user_id: string | null; matter_type: string; status: string; red_flags: string[]; created_at: string; updated_at: string };
        Insert: { id?: string; user_id?: string; matter_type: string; status?: string; red_flags?: string[] };
        Update: { status?: string; red_flags?: string[]; updated_at?: string };
      };
      documents: {
        Row: { id: string; case_id: string; template_id: string; field_data: Record<string, unknown>; generated_file_url: string | null; status: string; created_at: string };
        Insert: { id?: string; case_id: string; template_id: string; field_data: Record<string, unknown>; status?: string };
        Update: { generated_file_url?: string; status?: string };
      };
      deadlines: {
        Row: { id: string; case_id: string; deadline_date: string; description: string; reminder_sent: boolean };
        Insert: { id?: string; case_id: string; deadline_date: string; description: string };
        Update: { reminder_sent?: boolean };
      };
    };
  };
};
