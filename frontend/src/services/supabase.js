import { createClient } from '@supabase/supabase-js';

let rawUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wkodgklchuvzaqzshwkl.supabase.co';
rawUrl = (rawUrl || '').trim();

if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  if (!rawUrl.includes('.')) {
    rawUrl = `https://${rawUrl}.supabase.co`;
  } else {
    rawUrl = `https://${rawUrl}`;
  }
}

const supabaseUrl = rawUrl;
const supabaseAnonKey =
  (process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_WyxWhy4Z7KQLRLmAmiOAuw_r9VhPbk5').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : null;
