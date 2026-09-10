/**
 * Espelho dos domínios do backend (src/lib/constants.ts).
 * Mantido em arquivo próprio para que rótulos e cores fiquem centralizados.
 */

export const CARGOS = [
  'GERENTE_PF_PRIME',
  'GNS',
  'SUPERVISOR',
  'GERENTE_ADM',
  'GERENTE_GERAL',
] as const;
export type Cargo = (typeof CARGOS)[number];

export const CARGO_LABEL: Record<Cargo, string> = {
  GERENTE_PF_PRIME: 'GERENTE PF PRIME',
  GNS: 'GNS',
  SUPERVISOR: 'SUPERVISOR',
  GERENTE_ADM: 'GERENTE ADM',
  GERENTE_GERAL: 'GERENTE GERAL',
};

export const STATUS_CONTRATO = [
  'RECEBIDO_NA_AGENCIA',
  'AGUARDANDO_ASSINATURA_GERENTE_ADM',
  'AGUARDANDO_ASSINATURA_GERENTE_GERAL',
  'AGUARDANDO_ASSINATURA_SUPERVISOR',
  'AGUARDANDO_ASSINATURA_CLIENTE',
  'TODAS_ASSINATURAS_COLETADAS',
  'AGUARDANDO_ENVIO_DEVOLUCAO',
  'SAIDA_DA_AGENCIA',
] as const;
export type StatusContrato = (typeof STATUS_CONTRATO)[number];

export const STATUS_LABEL: Record<StatusContrato, string> = {
  RECEBIDO_NA_AGENCIA: 'Recebido na agência',
  AGUARDANDO_ASSINATURA_GERENTE_ADM: 'Aguardando assinatura Gerente ADM',
  AGUARDANDO_ASSINATURA_GERENTE_GERAL: 'Aguardando assinatura Gerente Geral',
  AGUARDANDO_ASSINATURA_SUPERVISOR: 'Aguardando assinatura Supervisor',
  AGUARDANDO_ASSINATURA_CLIENTE: 'Aguardando assinatura Cliente',
  TODAS_ASSINATURAS_COLETADAS: 'Todas assinaturas coletadas',
  AGUARDANDO_ENVIO_DEVOLUCAO: 'Aguardando envio/devolução',
  SAIDA_DA_AGENCIA: 'Saída da agência',
};

/** Classes Tailwind por status — usadas no badge e nos cartões do dashboard. */
export const STATUS_CLASSE: Record<StatusContrato, string> = {
  RECEBIDO_NA_AGENCIA: 'bg-sky-100 text-sky-800 ring-sky-200',
  AGUARDANDO_ASSINATURA_GERENTE_ADM: 'bg-amber-100 text-amber-800 ring-amber-200',
  AGUARDANDO_ASSINATURA_GERENTE_GERAL: 'bg-amber-100 text-amber-800 ring-amber-200',
  AGUARDANDO_ASSINATURA_SUPERVISOR: 'bg-amber-100 text-amber-800 ring-amber-200',
  AGUARDANDO_ASSINATURA_CLIENTE: 'bg-orange-100 text-orange-800 ring-orange-200',
  TODAS_ASSINATURAS_COLETADAS: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  AGUARDANDO_ENVIO_DEVOLUCAO: 'bg-violet-100 text-violet-800 ring-violet-200',
  SAIDA_DA_AGENCIA: 'bg-slate-200 text-slate-700 ring-slate-300',
};

/** Status alteráveis manualmente (os demais são controlados pelo sistema). */
export const STATUS_MANUAIS: StatusContrato[] = [
  'AGUARDANDO_ASSINATURA_GERENTE_ADM',
  'AGUARDANDO_ASSINATURA_GERENTE_GERAL',
  'AGUARDANDO_ASSINATURA_SUPERVISOR',
  'AGUARDANDO_ASSINATURA_CLIENTE',
  'AGUARDANDO_ENVIO_DEVOLUCAO',
];

export const ORIGENS = ['EMPREENDIMENTO', 'CAPTACAO_LIVRE'] as const;
export type Origem = (typeof ORIGENS)[number];

export const ORIGEM_LABEL: Record<Origem, string> = {
  EMPREENDIMENTO: 'Vinculado a empreendimento/parceiro',
  CAPTACAO_LIVRE: 'Captação livre',
};

export const TIPOS_ASSINATURA = ['GERENTE_ADM', 'GERENTE_GERAL', 'SUPERVISOR', 'CLIENTE'] as const;
export type TipoAssinatura = (typeof TIPOS_ASSINATURA)[number];

export const TIPO_ASSINATURA_LABEL: Record<TipoAssinatura, string> = {
  GERENTE_ADM: 'Gerente ADM',
  GERENTE_GERAL: 'Gerente Geral',
  SUPERVISOR: 'Supervisor',
  CLIENTE: 'Cliente',
};

/** Espelha CARGOS_AUTORIZADOS_POR_ASSINATURA do backend. */
export const CARGOS_AUTORIZADOS: Record<TipoAssinatura, Cargo[]> = {
  GERENTE_ADM: ['GERENTE_ADM'],
  GERENTE_GERAL: ['GERENTE_GERAL'],
  // GNS e SUPERVISOR sao cargos distintos: apenas SUPERVISOR assina este campo.
  SUPERVISOR: ['SUPERVISOR'],
  CLIENTE: [...CARGOS],
};

export const podeAssinar = (cargo: Cargo, tipo: TipoAssinatura) =>
  CARGOS_AUTORIZADOS[tipo].includes(cargo);

export const rotuloStatus = (status?: string | null) =>
  status ? (STATUS_LABEL[status as StatusContrato] ?? status) : 'Sem protocolo de entrada';
