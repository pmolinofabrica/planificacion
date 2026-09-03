import { supabase } from './supabase';

const GMAIL_DRAFT_URL = import.meta.env.VITE_GMAIL_DRAFT_URL;

export interface CrearBorradorParams {
  destinatario: string;
  asunto: string;
  cuerpo: string;
  remitente?: string;
  cco?: string[];
}

interface CrearBorradorResponse {
  ok: boolean;
  draftId?: string;
  error?: string;
  mensaje?: string;
}

export async function crearBorradorGmail(params: CrearBorradorParams): Promise<CrearBorradorResponse> {
  if (!GMAIL_DRAFT_URL) {
    console.warn('VITE_GMAIL_DRAFT_URL no configurada');
    return { ok: false, error: 'URL de Gmail drafts no configurada' };
  }

  try {
    const res = await fetch(GMAIL_DRAFT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        destinatario: params.destinatario,
        asunto: params.asunto,
        cuerpo: params.cuerpo,
        remitente: params.remitente || 'elmolino.residencias@gmail.com',
        cco: params.cco || [],
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: `Respuesta no valida: ${text.substring(0, 200)}` };
    }

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    return data as CrearBorradorResponse;
  } catch (err) {
    console.error('Error al crear borrador Gmail:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface TemplateVars {
  NOMBRE_RESIDENTE_1: string;
  NOMBRE_RESIDENTE_2: string;
  FECHA_RESIDENTE_1: string;
  FECHA_RESIDENTE_2: string;
  DETALLE_FECHA_RESIDENTE_1: string;
  DETALLE_FECHA_RESIDENTE_2: string;
}

export function reemplazarVariables(template: string, vars: TemplateVars): string {
  let resultado = template;
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return resultado;
}

export type ModoCorreo = 'pendiente' | 'confirmado';

const STORAGE_PREFIX = 'email_cambio';

export const DEFAULT_ASUNTO_PENDIENTE = 'Solicitud de cambio de turno - El Molino Residencias';
export const DEFAULT_ASUNTO_CONFIRMADO = 'Cambio de turno confirmado - El Molino Residencias';

export const DEFAULT_CUERPO_PENDIENTE = `Estimados,

Les escribimos para informarles que se ha recibido una solicitud de cambio de turno entre {NOMBRE_RESIDENTE_1} y {NOMBRE_RESIDENTE_2}.

Detalles de la solicitud:
- Residente 1: {NOMBRE_RESIDENTE_1} - {FECHA_RESIDENTE_1} ({DETALLE_FECHA_RESIDENTE_1})
- Residente 2: {NOMBRE_RESIDENTE_2} - {FECHA_RESIDENTE_2} ({DETALLE_FECHA_RESIDENTE_2})

Estamos revisando el pedido y confirmaremos la aceptación o rechazo en un correo electrónico posterior.

Saludos cordiales,
El Molino Fabrica Cultural - Residencias`;

export const DEFAULT_CUERPO_CONFIRMADO = `Estimados,

Les informamos que se ha CONFIRMADO el cambio de turno entre {NOMBRE_RESIDENTE_1} y {NOMBRE_RESIDENTE_2}.

Detalles del cambio:
- Residente 1: {NOMBRE_RESIDENTE_1} - {FECHA_RESIDENTE_1} ({DETALLE_FECHA_RESIDENTE_1})
- Residente 2: {NOMBRE_RESIDENTE_2} - {FECHA_RESIDENTE_2} ({DETALLE_FECHA_RESIDENTE_2})

El intercambio ya se encuentra efectivizado. Ante cualquier consulta, no dude en comunicarse.

Saludos cordiales,
El Molino Fabrica Cultural - Residencias`;

export function obtenerPlantilla(modo: ModoCorreo): { asunto: string; cuerpo: string } {
  const keyAsunto = `${STORAGE_PREFIX}_${modo}_asunto`;
  const keyCuerpo = `${STORAGE_PREFIX}_${modo}_cuerpo`;
  const asunto = localStorage.getItem(keyAsunto);
  const cuerpo = localStorage.getItem(keyCuerpo);
  if (modo === 'confirmado') {
    return {
      asunto: asunto ?? DEFAULT_ASUNTO_CONFIRMADO,
      cuerpo: cuerpo ?? DEFAULT_CUERPO_CONFIRMADO,
    };
  }
  return {
    asunto: asunto ?? DEFAULT_ASUNTO_PENDIENTE,
    cuerpo: cuerpo ?? DEFAULT_CUERPO_PENDIENTE,
  };
}

export function guardarPlantilla(modo: ModoCorreo, asunto: string, cuerpo: string) {
  localStorage.setItem(`${STORAGE_PREFIX}_${modo}_asunto`, asunto);
  localStorage.setItem(`${STORAGE_PREFIX}_${modo}_cuerpo`, cuerpo);
}

export function resetPlantilla(modo: ModoCorreo) {
  localStorage.removeItem(`${STORAGE_PREFIX}_${modo}_asunto`);
  localStorage.removeItem(`${STORAGE_PREFIX}_${modo}_cuerpo`);
}

export async function crearBorradorParaTarjeta(params: {
  modo: ModoCorreo;
  emails: string[];
  templateVars: TemplateVars;
  idTransaccion?: number | null;
  usuario?: string;
}): Promise<CrearBorradorResponse & { registrado?: boolean }> {
  const { modo, emails, templateVars } = params;
  const plantilla = obtenerPlantilla(modo);
  const resultado = await crearBorradorGmail({
    destinatario: emails[0] || '',
    asunto: plantilla.asunto,
    cuerpo: reemplazarVariables(plantilla.cuerpo, templateVars),
    cco: emails.slice(1),
  });

  // El registro en la DB se hace SIEMPRE que se pulse "crear borrador",
  // independientemente del resultado de Gmail, para que quede persistido
  // en la nube (sobrevive a recargas y a cambios de dispositivo).
  let registrado: boolean | undefined;
  if (params.idTransaccion != null) {
    try {
      const registro = await registrarBorrador(params.idTransaccion, modo, params.usuario);
      registrado = registro.ok;
    } catch (e) {
      console.error('Error al registrar borrador en DB:', e);
      registrado = false;
    }
  }

  return { ...resultado, registrado };
}

export async function registrarBorrador(
  idTransaccion: number,
  tipo: ModoCorreo,
  usuario?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('fn_registrar_borrador' as any, {
    p_id_transaccion: idTransaccion,
    p_tipo_borrador: tipo,
    p_usuario: usuario || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarBorrador(
  idTransaccion: number,
  tipo: ModoCorreo
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('fn_eliminar_borrador' as any, {
    p_id_transaccion: idTransaccion,
    p_tipo_borrador: tipo,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
