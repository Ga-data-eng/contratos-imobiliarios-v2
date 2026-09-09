const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** dd/mm/aaaa HH:mm */
export const dataHora = (valor?: string | Date | null) =>
  valor ? fmtDataHora.format(new Date(valor)) : '—';

/** dd/mm/aaaa */
export const data = (valor?: string | Date | null) =>
  valor ? fmtData.format(new Date(valor)) : '—';

/** "há 3 dias", "hoje" — usado nos alertas de contrato parado. */
export function haQuantoTempo(valor?: string | Date | null): string {
  if (!valor) return '—';
  const dias = Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

export const plural = (n: number, singular: string, plural_: string) =>
  `${n} ${n === 1 ? singular : plural_}`;
