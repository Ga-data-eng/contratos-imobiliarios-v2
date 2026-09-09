import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Modelos append-only: uma vez gravados, nao podem ser alterados nem apagados.
 * A regra vale para qualquer caminho de codigo (rotas, scripts, console),
 * atendendo ao requisito "logs de auditoria nao podem ser editados ou apagados".
 */
const MODELOS_IMUTAVEIS = new Set(['LogAuditoria', 'Movimentacao', 'StatusHistorico']);

const OPERACOES_BLOQUEADAS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);

const base = new PrismaClient({ log: ['warn', 'error'] });

base.$use(async (params, next) => {
  if (
    params.model &&
    MODELOS_IMUTAVEIS.has(params.model) &&
    OPERACOES_BLOQUEADAS.has(params.action)
  ) {
    throw new Error(
      `Operacao "${params.action}" bloqueada: ${params.model} e um registro imutavel de auditoria.`,
    );
  }
  return next(params);
});

export const prisma = base;

/**
 * O SQLite nao aceita `mode: 'insensitive'` no Prisma (seu LIKE ja e
 * case-insensitive para ASCII). No PostgreSQL o modo precisa ser explicito.
 */
export function contemTexto(valor: string) {
  return env.databaseProvider === 'postgresql'
    ? ({ contains: valor, mode: 'insensitive' } as const)
    : ({ contains: valor } as const);
}
