export function aFormatoFecha(input: string | null | undefined): string {
  if (!input) return '';
  const m = String(input).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(input);
  const [, anio, mes, dia] = m;
  return `${dia}/${mes}/${anio}`;
}

export function aFormatoFechaHora(input: string | null | undefined): string {
  if (!input) return '';
  return aFormatoFecha(input);
}
