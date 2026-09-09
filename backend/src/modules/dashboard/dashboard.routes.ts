import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar } from '../../middleware/auth';
import { env } from '../../config/env';
import { STATUS_CONTRATO, type StatusContrato } from '../../lib/constants';
import { diasDesde } from '../../lib/datas';

export const dashboardRouter = Router();
dashboardRouter.use(autenticar);

/**
 * GET /api/dashboard?dias=5
 * Indicadores: contratos por status, contratos parados há mais de X dias,
 * contratos por gerente responsável e distribuição por origem.
 */
dashboardRouter.get(
  '/',
  ah(async (req, res) => {
    const dias = z.coerce
      .number()
      .int()
      .min(1)
      .max(365)
      .default(env.alertaDiasParado)
      .parse(req.query.dias || env.alertaDiasParado);

    const limite = new Date(Date.now() - dias * 86_400_000);

    const [porStatusBruto, semProtocolo, totalContratos, porGerenteBruto, porOrigemBruto, parados] =
      await Promise.all([
        prisma.cliente.groupBy({ by: ['statusAtual'], _count: { _all: true } }),
        prisma.cliente.count({ where: { statusAtual: null } }),
        prisma.cliente.count(),
        prisma.cliente.groupBy({ by: ['gerenteResponsavelId'], _count: { _all: true } }),
        prisma.cliente.groupBy({ by: ['origem'], _count: { _all: true } }),
        prisma.cliente.findMany({
          where: {
            statusDesde: { lt: limite },
            statusAtual: { not: 'SAIDA_DA_AGENCIA' },
          },
          orderBy: { statusDesde: 'asc' },
          take: 50,
          include: {
            gerenteResponsavel: { select: { id: true, nomeCompleto: true, cargo: true } },
          },
        }),
      ]);

    const contagem = new Map(porStatusBruto.map((linha) => [linha.statusAtual, linha._count._all]));

    const porStatus = (STATUS_CONTRATO as readonly StatusContrato[]).map((status) => ({
      status,
      total: contagem.get(status) ?? 0,
    }));

    const gerentes = await prisma.usuario.findMany({
      where: { id: { in: porGerenteBruto.map((g) => g.gerenteResponsavelId) } },
      select: { id: true, nomeCompleto: true, cargo: true },
    });
    const porGerente = porGerenteBruto
      .map((linha) => {
        const gerente = gerentes.find((g) => g.id === linha.gerenteResponsavelId);
        return {
          gerenteId: linha.gerenteResponsavelId,
          nome: gerente?.nomeCompleto ?? '—',
          cargo: gerente?.cargo ?? '—',
          total: linha._count._all,
        };
      })
      .sort((a, b) => b.total - a.total);

    const porOrigem = porOrigemBruto.map((linha) => ({
      origem: linha.origem,
      total: linha._count._all,
    }));

    const emAndamento = porStatus
      .filter((s) => s.status !== 'SAIDA_DA_AGENCIA')
      .reduce((soma, s) => soma + s.total, 0);

    res.json({
      parametros: { diasAlerta: dias },
      resumo: {
        totalContratos,
        emAndamento,
        semProtocolo,
        finalizados: contagem.get('SAIDA_DA_AGENCIA') ?? 0,
        assinaturasCompletas: contagem.get('TODAS_ASSINATURAS_COLETADAS') ?? 0,
        paradosAlerta: parados.length,
      },
      porStatus,
      porGerente,
      porOrigem,
      contratosParados: parados.map((c) => ({
        id: c.id,
        nomeCompleto: c.nomeCompleto,
        numeroContrato: c.numeroContrato,
        statusAtual: c.statusAtual,
        statusDesde: c.statusDesde,
        diasParado: diasDesde(c.statusDesde),
        gerenteResponsavel: c.gerenteResponsavel,
      })),
    });
  }),
);
