const FUSO = 'America/Sao_Paulo';

const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** dd/mm/aaaa HH:mm */
export const dataHoraBR = (valor: Date | string | null | undefined) =>
  valor ? fmtDataHora.format(new Date(valor)) : '—';

/** dd/mm/aaaa */
export const dataBR = (valor: Date | string | null | undefined) =>
  valor ? fmtData.format(new Date(valor)) : '—';

/** Dias inteiros decorridos desde `desde`. */
export function diasDesde(desde: Date | string | null | undefined): number | null {
  if (!desde) return null;
  const ms = Date.now() - new Date(desde).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
