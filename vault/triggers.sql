-- Supabase Triggers (public)

-- Table: asignaciones | Trigger: trg_cap_servicio_asignaciones | Event: INSERT
EXECUTE FUNCTION public.fn_registrar_capacitacion_servicio()

-- Table: asignaciones | Trigger: trg_cap_servicio_asignaciones | Event: UPDATE
EXECUTE FUNCTION public.fn_registrar_capacitacion_servicio()

-- Table: asignaciones_visita | Trigger: trg_asignacion_visita_historial | Event: UPDATE
EXECUTE FUNCTION public.fn_asignacion_visita_historial()

-- Table: certificados | Trigger: trg_certificado_aprobado | Event: UPDATE
EXECUTE FUNCTION public.func_certificado_aprobado()

-- Table: certificados | Trigger: trg_certificado_rechazado | Event: UPDATE
EXECUTE FUNCTION public.func_certificado_rechazado()

-- Table: convocatoria | Trigger: trg_limpiar_asignaciones_del | Event: DELETE
EXECUTE FUNCTION public.fn_limpiar_asignaciones_huerfanas()

-- Table: convocatoria | Trigger: trg_limpiar_asignaciones_upd | Event: UPDATE
EXECUTE FUNCTION public.fn_limpiar_asignaciones_huerfanas()

-- Table: convocatoria | Trigger: trg_sync_cap_on_grupo_change | Event: UPDATE
EXECUTE FUNCTION public.fn_sync_cap_participantes_on_grupo_change()

-- Table: descansos | Trigger: trg_asignar_descanso_aprobado | Event: UPDATE
EXECUTE FUNCTION public.func_asignar_descanso_aprobado()

-- Table: inasistencias | Trigger: trg_auto_requiere_certificado | Event: INSERT
EXECUTE FUNCTION public.func_auto_requiere_certificado()

-- Table: inasistencias | Trigger: trg_control_tardanzas | Event: INSERT
EXECUTE FUNCTION public.procesar_tardanzas()

-- Table: inasistencias | Trigger: trg_update_asistencia_on_inasistencia | Event: INSERT
EXECUTE FUNCTION public.fn_update_asistencia_on_inasistencia()

-- Table: inasistencias | Trigger: trg_update_requiere_certificado | Event: UPDATE
EXECUTE FUNCTION public.func_update_requiere_certificado()

-- Table: menu | Trigger: trg_cap_servicio_menu | Event: INSERT
EXECUTE FUNCTION public.fn_registrar_capacitacion_servicio()

-- Table: menu | Trigger: trg_cap_servicio_menu | Event: UPDATE
EXECUTE FUNCTION public.fn_registrar_capacitacion_servicio()

-- Table: planificacion | Trigger: trg_planificacion_a_capacitaciones | Event: INSERT
EXECUTE FUNCTION public.crear_capacitacion_desde_planificacion()

-- Table: planificacion | Trigger: trg_planificacion_crear_capacitacion | Event: INSERT
EXECUTE FUNCTION public.trg_crear_capacitacion_desde_planificacion()

-- Table: planificacion | Trigger: trg_set_horario_planificacion | Event: INSERT
EXECUTE FUNCTION public.func_set_horario_planificacion()

-- Table: planificacion | Trigger: trg_set_horario_planificacion | Event: UPDATE
EXECUTE FUNCTION public.func_set_horario_planificacion()

-- Table: planificacion | Trigger: trg_update_planificacion_a_capacitaciones | Event: UPDATE
EXECUTE FUNCTION public.actualizar_capacitacion_desde_planificacion()

-- Table: stg_calendario_import | Trigger: trg_procesar_importacion | Event: INSERT
EXECUTE FUNCTION public.procesar_importacion_calendario()

-- Table: system_errors | Trigger: trg_detectar_patron_error | Event: INSERT
EXECUTE FUNCTION public.func_detectar_patron_error()

-- Table: system_errors | Trigger: trg_error_resuelto | Event: UPDATE
EXECUTE FUNCTION public.func_error_resuelto()

