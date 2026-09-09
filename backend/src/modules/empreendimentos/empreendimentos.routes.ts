import { Router } from 'express';
import { z } from 'zod';
import { prisma, contemTexto } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { conflict, notFound } from '../../lib/errors';

export const empreendimentosRouter = Router();
empreendimentosRouter.use(autenticar);

const opcional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null);

const empreendimentoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do empreendimento.').max(150),
  endereco: opcional,
  parceiroImobiliarioId: z.string().uuid('Selecione o parceiro imobiliário vinculado.'),
});

/** GET /api/empreendimentos?q=&parceiroId= */
empreendimentosRouter.get(
  '/',
  ah(async (req, res) => {
    const q = z.string().trim().optional().parse(req.query.q || undefined);
    const parceiroId = z.string().uuid().optional().parse(req.query.parceiroId || undefined);

    const empreendimentos = await prisma.empreendimento.findMany({
      where: {
        ...(q ? { nome: contemTexto(q) } : {}),
        ...(parceiroId ? { parceiroImobiliarioId: parceiroId } : {}),
      },
      orderBy: { nome: 'asc' },
      include: {
        parceiro: { select: { id: true, nome: true, contato: true } },
        _count: { select: { clientes: true } },
      },
    });
    res.json({ empreendimentos });
  }),
);

/** GET /api/empreendimentos/:id */
empreendimentosRouter.get(
  '/:id',
  ah(async (req, res) => {
    const empreendimento = await prisma.empreendimento.findUnique({
      where: { id: req.params.id },
      include: { parceiro: true },
    });
    if (!empreendimento) throw notFound('Empreendimento não encontrado.');
    res.json({ empreendimento });
  }),
);

/** POST /api/empreendimentos */
empreendimentosRouter.post(
  '/',
  ah(async (req, res) => {
    const dados = empreendimentoSchema.parse(req.body);
    const parceiro = await prisma.parceiroImobiliario.findUnique({
      where: { id: dados.parceiroImobiliarioId },
    });
    if (!parceiro) throw notFound('Parceiro imobiliário informado não existe.');

    const empreendimento = await prisma.empreendimento.create({
      data: dados,
      include: { parceiro: true },
    });
    await auditar(req, {
      acao: 'EMPREENDIMENTO_CRIADO',
      entidadeAfetada: 'Empreendimento',
      entidadeId: empreendimento.id,
      detalhes: dados,
    });
    res.status(201).json({ empreendimento });
  }),
);

/** PUT /api/empreendimentos/:id */
empreendimentosRouter.put(
  '/:id',
  ah(async (req, res) => {
    const dados = empreendimentoSchema.parse(req.body);
    const empreendimento = await prisma.empreendimento.update({
      where: { id: req.params.id },
      data: dados,
      include: { parceiro: true },
    });
    await auditar(req, {
      acao: 'EMPREENDIMENTO_ATUALIZADO',
      entidadeAfetada: 'Empreendimento',
      entidadeId: empreendimento.id,
      detalhes: dados,
    });
    res.json({ empreendimento });
  }),
);

/** DELETE /api/empreendimentos/:id - bloqueado se houver cliente vinculado. */
empreendimentosRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const vinculados = await prisma.cliente.count({ where: { empreendimentoId: req.params.id } });
    if (vinculados > 0) {
      throw conflict(
        `Não é possível excluir: existem ${vinculados} cliente(s) vinculados a este empreendimento.`,
      );
    }
    await prisma.empreendimento.delete({ where: { id: req.params.id } });
    await auditar(req, {
      acao: 'EMPREENDIMENTO_EXCLUIDO',
      entidadeAfetada: 'Empreendimento',
      entidadeId: req.params.id,
    });
    res.status(204).end();
  }),
);
