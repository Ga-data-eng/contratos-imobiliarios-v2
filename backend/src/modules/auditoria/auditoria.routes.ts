import { Router } from 'express';
import { z } from 'zod';
import { prisma, contemTexto } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar, exigirCargo } from '../../middleware/auth';

export const auditoriaRouter = Router();

/**
 * Consulta do log de auditoria. Restrita à gestão da agência.
 * Não existem rotas de escrita/edição/exclusão: o log é append-only e o
 * próprio client Prisma bloqueia update/delete (src/lib/prisma.ts).
 */
auditoriaRouter.get(
  '/',
  autenticar,
  exigirCargo('GERENTE_GERAL', 'GERENTE_ADM'),
  ah(async (req, res) => {
    const filtros = z
      .object({
        q: z.string().trim().min(1).optional(),
        entidade: z.string().trim().min(1).optional(),
        entidadeId: z.string().trim().min(1).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse({
        q: req.query.q || undefined,
        entidade: req.query.entidade || undefined,
        entidadeId: req.query.entidadeId || undefined,
        page: req.query.page || undefined,
        pageSize: req.query.pageSize || undefined,
      });

    const where = {
      ...(filtros.entidade ? { entidadeAfetada: filtros.entidade } : {}),
      ...(filtros.entidadeId ? { entidadeId: filtros.entidadeId } : {}),
      ...(filtros.q
        ? {
            OR: [
              { usuarioNome: contemTexto(filtros.q) },
              { usuarioEmail: contemTexto(filtros.q) },
              { acao: contemTexto(filtros.q) },
              { detalhes: contemTexto(filtros.q) },
            ],
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.logAuditoria.count({ where }),
      prisma.logAuditoria.findMany({
        where,
        orderBy: { dataHora: 'desc' },
        skip: (filtros.page - 1) * filtros.pageSize,
        take: filtros.pageSize,
      }),
    ]);

    res.json({
      logs,
      paginacao: {
        page: filtros.page,
        pageSize: filtros.pageSize,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / filtros.pageSize)),
      },
    });
  }),
);
