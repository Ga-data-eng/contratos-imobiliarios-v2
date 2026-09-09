/**
 * Dominios fechados do sistema.
 *
 * Como o schema Prisma precisa rodar tanto em SQLite quanto em PostgreSQL,
 * os campos de dominio fechado sao `String` no banco. Estas constantes sao a
 * fonte da verdade e alimentam os schemas Zod de todas as rotas de escrita.
 */

export const CARGOS = [
  'GERENTE_PF_PRIME',
  'GNS_SUPERVISOR',
  'GERENTE_ADM',
  'GERENTE_GERAL',
] as const;
export type Cargo = (typeof CARGOS)[number];

export const CARGO_LABEL: Record<Cargo, string> = {
  GERENTE_PF_PRIME: 'GERENTE PF PRIME',
  GNS_SUPERVISOR: 'GNS E SUPERVISOR',
  GERENTE_ADM: 'GERENTE ADM',
  GERENTE_GERAL: 'GERENTE GERAL',
};

export const ORIGENS_CLIENTE = ['EMPREENDIMENTO', 'CAPTACAO_LIVRE'] as const;
export type OrigemCliente = (typeof ORIGENS_CLIENTE)[number];

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
  RECEBIDO_NA_AGENCIA: 'RECEBIDO NA AGÊNCIA',
  AGUARDANDO_ASSINATURA_GERENTE_ADM: 'AGUARDANDO ASSINATURA GERENTE ADM',
  AGUARDANDO_ASSINATURA_GERENTE_GERAL: 'AGUARDANDO ASSINATURA GERENTE GERAL',
  AGUARDANDO_ASSINATURA_SUPERVISOR: 'AGUARDANDO ASSINATURA SUPERVISOR',
  AGUARDANDO_ASSINATURA_CLIENTE: 'AGUARDANDO ASSINATURA CLIENTE',
  TODAS_ASSINATURAS_COLETADAS: 'TODAS ASSINATURAS COLETADAS',
  AGUARDANDO_ENVIO_DEVOLUCAO: 'AGUARDANDO ENVIO/DEVOLUÇÃO',
  SAIDA_DA_AGENCIA: 'SAÍDA DA AGÊNCIA',
};

/**
 * Status que o usuario pode aplicar manualmente pela tela de protocolo.
 * Os demais sao controlados pelo sistema:
 *  - RECEBIDO_NA_AGENCIA         -> protocolo de entrada
 *  - TODAS_ASSINATURAS_COLETADAS -> automatico, quando as 4 assinaturas existem
 *  - SAIDA_DA_AGENCIA            -> protocolo de saida
 */
export const STATUS_MANUAIS: StatusContrato[] = [
  'AGUARDANDO_ASSINATURA_GERENTE_ADM',
  'AGUARDANDO_ASSINATURA_GERENTE_GERAL',
  'AGUARDANDO_ASSINATURA_SUPERVISOR',
  'AGUARDANDO_ASSINATURA_CLIENTE',
  'AGUARDANDO_ENVIO_DEVOLUCAO',
];

export const TIPOS_MOVIMENTACAO = ['ENTRADA', 'SAIDA'] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const TIPOS_ASSINATURA = [
  'GERENTE_ADM',
  'GERENTE_GERAL',
  'SUPERVISOR',
  'CLIENTE',
] as const;
export type TipoAssinatura = (typeof TIPOS_ASSINATURA)[number];

export const TIPO_ASSINATURA_LABEL: Record<TipoAssinatura, string> = {
  GERENTE_ADM: 'Gerente ADM',
  GERENTE_GERAL: 'Gerente Geral',
  SUPERVISOR: 'Supervisor (GNS e Supervisor)',
  CLIENTE: 'Cliente',
};

/** Ordem em que as assinaturas sao cobradas (define o proximo status automatico). */
export const ORDEM_ASSINATURAS: TipoAssinatura[] = [
  'GERENTE_ADM',
  'GERENTE_GERAL',
  'SUPERVISOR',
  'CLIENTE',
];

/** Status "aguardando" correspondente a cada assinatura pendente. */
export const STATUS_AGUARDANDO_POR_ASSINATURA: Record<TipoAssinatura, StatusContrato> = {
  GERENTE_ADM: 'AGUARDANDO_ASSINATURA_GERENTE_ADM',
  GERENTE_GERAL: 'AGUARDANDO_ASSINATURA_GERENTE_GERAL',
  SUPERVISOR: 'AGUARDANDO_ASSINATURA_SUPERVISOR',
  CLIENTE: 'AGUARDANDO_ASSINATURA_CLIENTE',
};

/**
 * Quem pode assinar cada campo.
 *
 * A assinatura do CLIENTE e coletada presencialmente no dispositivo de
 * qualquer gerente, por isso aceita todos os cargos - o nome do cliente e
 * gravado junto com o usuario que operou a coleta.
 */
export const CARGOS_AUTORIZADOS_POR_ASSINATURA: Record<TipoAssinatura, Cargo[]> = {
  GERENTE_ADM: ['GERENTE_ADM'],
  GERENTE_GERAL: ['GERENTE_GERAL'],
  SUPERVISOR: ['GNS_SUPERVISOR'],
  CLIENTE: [...CARGOS],
};

export const STATUS_ASSINATURA = ['PENDENTE', 'ASSINADO'] as const;
export type StatusAssinatura = (typeof STATUS_ASSINATURA)[number];

/** Status a partir dos quais a saida do contrato e considerada normal. */
export const STATUS_LIBERADOS_PARA_SAIDA: StatusContrato[] = [
  'TODAS_ASSINATURAS_COLETADAS',
  'AGUARDANDO_ENVIO_DEVOLUCAO',
];
