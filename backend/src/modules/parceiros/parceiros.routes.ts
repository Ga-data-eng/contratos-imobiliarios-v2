import { Router } from 'express';
import { z } from 'zod';
import { prisma, contemTexto } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { conflict, notFound } from '../../lib/errors';

export const parceirosRouter = Router();
parceirosRouter.use(autenticar);

const parceiroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do parceiro/imobiliária.').max(150),
  contato: z
    .string()
    .trim()
    .max(150)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
});

/** GET /api/parceiros?q= */
parceirosRouter.get(
  '/',
  ah(async (req, res) => {
    const q = z.string().trim().optional().parse(req.query.q || undefined);
    const parceiros = await prisma.parceiroImobiliario.findMany({
      where: q ? { nome: contemTexto(q) } : undefined,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { empreendimentos: true } } },
    });
    res.json({ parceiros });
  }),
);

/** GET /api/parceiros/:id */
parceirosRouter.get(
  '/:id',
  ah(async (req, res) => {
    const parceiro = await prisma.parceiroImobiliario.findUnique({
      where: { id: req.params.id },
      include: { empreendimentos: { orderBy: { nome: 'asc' } } },
    });
    if (!parceiro) throw notFound('Parceiro imobiliário não encontrado.');
    res.json({ parceiro });
  }),
);

/** POST /api/parceiros */
parceirosRouter.post(
  '/',
  ah(async (req, res) => {
    const dados = parceiroSchema.parse(req.body);
    const parceiro = await prisma.parceiroImobiliario.create({ data: dados });
    await auditar(req, {
      acao: 'PARCEIRO_CRIADO',
      entidadeAfetada: 'ParceiroImobiliario',
      entidadeId: parceiro.id,
      detalhes: dados,
    });
    res.status(201).json({ parceiro });
  }),
);

/** PUT /api/parceiros/:id */
parceirosRouter.put(
  '/:id',
  ah(async (req, res) => {
    const dados = parceiroSchema.parse(req.body);
    const parceiro = await prisma.parceiroImobiliario.update({
      where: { id: req.params.id },
      data: dados,
    });
    await auditar(req, {
      acao: 'PARCEIRO_ATUALIZADO',
      entidadeAfetada: 'ParceiroImobiliario',
      entidadeId: parceiro.id,
      detalhes: dados,
    });
    res.json({ parceiro });
  }),
);

/** DELETE /api/parceiros/:id - bloqueado se houver empreendimento vinculado. */
parceirosRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const vinculados = await prisma.empreendimento.count({
      where: { parceiroImobiliarioId: req.params.id },
    });
    if (vinculados > 0) {
      throw conflict(
        `Não é possível excluir: existem ${vinculados} empreendimento(s) vinculados a este parceiro.`,
      );
    }
    await prisma.parceiroImobiliario.delete({ where: { id: req.params.id } });
    await auditar(req, {
      acao: 'PARCEIRO_EXCLUIDO',
      entidadeAfetada: 'ParceiroImobiliario',
      entidadeId: req.params.id,
    });
    res.status(204).end();
  }),
);
