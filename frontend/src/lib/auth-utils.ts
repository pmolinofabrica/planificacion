import { supabase } from './supabase';

export async function obtenerUsuarioActual(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.email) return data.user.email;
    if (data?.user?.id) return String(data.user.id);
    return 'sistema';
  } catch {
    return 'sistema';
  }
}
