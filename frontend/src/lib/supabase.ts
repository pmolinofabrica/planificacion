import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        async getSession() {
          return { data: { session: null } };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async signInWithPassword() {
          return { data: null, error: { message: 'Supabase no esta configurado en este entorno.' } };
        },
        async signOut() {
          return { error: null };
        },
      },
      from() {
        throw new Error('Supabase no esta configurado en este entorno.');
      },
    } as any;
