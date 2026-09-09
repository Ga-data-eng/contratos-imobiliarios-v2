import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { conflict, notFound } from '../lib/errors';
import {
  ORDEM_ASSINATURAS,
  STATUS_AGUARDANDO_POR_ASSINATURA,
  type StatusContrato,
  type TipoAssinatura,
} from '../lib/constants';

type ClientePrisma = Prisma.TransactionClient | typeof prisma;

/**
 * Aplica um novo status ao contrato e grava a linha correspondente na trilha
 * imutavel de status. Se o status nao mudou, nada e registrado.
 */
export async function aplicarStatus(
  db: ClientePrisma,
  params: {
    clienteId: string;
    statusNovo: StatusContrato;
    usuarioId: string;
    motivo?: string | null;
    observacoes?: string | null;
  },
) {
  const cliente = await db.cliente.findUnique({
    where: { id: params.clienteId },
    select: { id: true, statusAtual: true },
  });
  if (!cliente) throw notFound('Contrato/cliente não encontrado.');
  if (cliente.statusAtual === params.statusNovo) return cliente.statusAtual;

  const agora = new Date();

  await db.statusHistorico.create({
    data: {
      clienteId: params.clienteId,
      statusAnterior: cliente.statusAtual,
      statusNovo: params.statusNovo,
      usuarioId: params.usuarioId,
      motivo: params.motivo ?? null,
      observacoes: params.observacoes ?? null,
      dataHora: agora,
    },
  });

  await db.cliente.update({
    where: { id: params.clienteId },
    data: { statusAtual: params.statusNovo, statusDesde: agora },
  });

  return params.statusNovo;
}

/**
 * Calcula o status que o contrato deve assumir com base nas assinaturas ja
 * coletadas: o primeiro tipo pendente na ordem oficial, ou
 * TODAS_ASSINATURAS_COLETADAS quando as 4 estiverem assinadas.
 */
export function statusPelasAssinaturas(
  assinaturas: { tipo: string; status: string }[],
): StatusContrato {
  const pendente = ORDEM_ASSINATURAS.find((tipo) => {
    const registro = assinaturas.find((a) => a.tipo === tipo);
    return !registro || registro.status !== 'ASSINADO';
  });
  return pendente
    ? STATUS_AGUARDANDO_POR_ASSINATURA[pendente as TipoAssinatura]
    : 'TODAS_ASSINATURAS_COLETADAS';
}

/** Cria as 4 linhas de assinatura PENDENTE de um contrato recem-cadastrado. */
export async function criarAssinaturasPendentes(db: ClientePrisma, clienteId: string) {
  await db.assinatura.createMany({
    data: ORDEM_ASSINATURAS.map((tipo) => ({ clienteId, tipo, status: 'PENDENTE' })),
  });
}

/** Bloqueia operacoes em contrato que ja saiu da agencia. */
export function garantirContratoNaAgencia(statusAtual: string | null) {
  if (statusAtual === 'SAIDA_DA_AGENCIA') {
    throw conflict(
      'Este contrato já teve saída registrada. Registre uma nova entrada antes de movimentá-lo.',
    );
  }
}
