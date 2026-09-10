import { Router } from 'express';
import { z } from 'zod';
import { prisma, contemTexto } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { badRequest, notFound } from '../../lib/errors';
import { ORIGENS_CLIENTE, STATUS_CONTRATO, type StatusContrato } from '../../lib/constants';
import { criarAssinaturasPendentes } from '../../services/contrato.service';

export const clientesRouter = Router();
clientesRouter.use(autenticar);

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null);

const clienteSchema = z
  .object({
    nomeCompleto: z.string().trim().min(3, 'Informe o nome completo do cliente.').max(150),
    numeroContrato: z.string().trim().min(1, 'Informe o número do contrato.').max(60),
    numeroProposta: z.string().trim().min(1, 'Informe o número da proposta.').max(60),
    gerenteResponsavelId: z.string().uuid('Selecione o gerente responsável.'),
    origem: z.enum(ORIGENS_CLIENTE, {
      errorMap: () => ({ message: 'Selecione a origem do cliente.' }),
    }),
    empreendimentoId: z.string().uuid().nullable().optional(),
    observacoes: textoOpcional,
  })
  .superRefine((dados, ctx) => {
    if (dados.origem === 'EMPREENDIMENTO' && !dados.empreendimentoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['empreendimentoId'],
        message: 'Origem "Empreendimento" exige a seleção de um empreendimento.',
      });
    }
  })
  .transform((dados) => ({
    ...dados,
    // Captação livre nunca guarda vínculo com empreendimento/parceiro.
    empreendimentoId: dados.origem === 'CAPTACAO_LIVRE' ? null : dados.empreendimentoId!,
  }));

const inclusaoResumo = {
  gerenteResponsavel: { select: { id: true, nomeCompleto: true, email: true, cargo: true } },
  empreendimento: { include: { parceiro: { select: { id: true, nome: true, contato: true } } } },
  assinaturas: { select: { tipo: true, status: true, dataHora: true, responsavelNome: true } },
} as const;

/**
 * GET /api/clientes
 * Busca e listagem paginada. Filtros: q (nome, contrato, proposta,
 * empreendimento, parceiro, gerente), status, origem, gerenteId,
 * empreendimentoId, parceiroId.
 */
clientesRouter.get(
  '/',
  ah(async (req, res) => {
    const filtros = z
      .object({
        q: z.string().trim().min(1).optional(),
        status: z.enum(STATUS_CONTRATO).optional(),
        semProtocolo: z.coerce.boolean().optional(),
        origem: z.enum(ORIGENS_CLIENTE).optional(),
        gerenteId: z.string().uuid().optional(),
        empreendimentoId: z.string().uuid().optional(),
        parceiroId: z.string().uuid().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse({
        q: req.query.q || undefined,
        status: req.query.status || undefined,
        semProtocolo: req.query.semProtocolo || undefined,
        origem: req.query.origem || undefined,
        gerenteId: req.query.gerenteId || undefined,
        empreendimentoId: req.query.empreendimentoId || undefined,
        parceiroId: req.query.parceiroId || undefined,
        page: req.query.page || undefined,
        pageSize: req.query.pageSize || undefined,
      });

    const where = {
      ...(filtros.q
        ? {
            OR: [
              { nomeCompleto: contemTexto(filtros.q) },
              { numeroContrato: contemTexto(filtros.q) },
              { numeroProposta: contemTexto(filtros.q) },
              { empreendimento: { nome: contemTexto(filtros.q) } },
              { empreendimento: { parceiro: { nome: contemTexto(filtros.q) } } },
              { gerenteResponsavel: { nomeCompleto: contemTexto(filtros.q) } },
            ],
          }
        : {}),
      ...(filtros.status ? { statusAtual: filtros.status } : {}),
      ...(filtros.semProtocolo ? { statusAtual: null } : {}),
      ...(filtros.origem ? { origem: filtros.origem } : {}),
      ...(filtros.gerenteId ? { gerenteResponsavelId: filtros.gerenteId } : {}),
      ...(filtros.empreendimentoId ? { empreendimentoId: filtros.empreendimentoId } : {}),
      ...(filtros.parceiroId
        ? { empreendimento: { parceiroImobiliarioId: filtros.parceiroId } }
        : {}),
    };

    const [total, clientes] = await Promise.all([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        include: inclusaoResumo,
        orderBy: [{ atualizadoEm: 'desc' }],
        skip: (filtros.page - 1) * filtros.pageSize,
        take: filtros.pageSize,
      }),
    ]);

    res.json({
      clientes,
      paginacao: {
        page: filtros.page,
        pageSize: filtros.pageSize,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / filtros.pageSize)),
      },
    });
  }),
);

/** GET /api/clientes/:id - ficha completa do contrato. */
clientesRouter.get(
  '/:id',
  ah(async (req, res) => {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        gerenteResponsavel: { select: { id: true, nomeCompleto: true, email: true, cargo: true } },
        empreendimento: { include: { parceiro: true } },
        assinaturas: {
          include: { usuario: { select: { id: true, nomeCompleto: true, cargo: true } } },
        },
        movimentacoes: {
          orderBy: { dataHora: 'desc' },
          include: { usuario: { select: { id: true, nomeCompleto: true, cargo: true } } },
        },
      },
    });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    res.json({ cliente });
  }),
);

/** POST /api/clientes - cadastra o cliente e cria as 4 assinaturas pendentes. */
clientesRouter.post(
  '/',
  ah(async (req, res) => {
    const dados = clienteSchema.parse(req.body);

    const gerente = await prisma.usuario.findUnique({ where: { id: dados.gerenteResponsavelId } });
    if (!gerente) throw notFound('Gerente responsável informado não existe.');

    if (dados.empreendimentoId) {
      const empreendimento = await prisma.empreendimento.findUnique({
        where: { id: dados.empreendimentoId },
      });
      if (!empreendimento) throw notFound('Empreendimento informado não existe.');
    }

    const cliente = await prisma.$transaction(async (tx) => {
      const criado = await tx.cliente.create({ data: dados });
      await criarAssinaturasPendentes(tx, criado.id);
      return tx.cliente.findUniqueOrThrow({ where: { id: criado.id }, include: inclusaoResumo });
    });

    await auditar(req, {
      acao: 'CLIENTE_CRIADO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: dados,
    });

    res.status(201).json({ cliente });
  }),
);

/** PUT /api/clientes/:id - edita dados cadastrais (não altera status). */
clientesRouter.put(
  '/:id',
  ah(async (req, res) => {
    const dados = clienteSchema.parse(req.body);

    const atual = await prisma.cliente.findUnique({ where: { id: req.params.id } });
    if (!atual) throw notFound('Cliente/contrato não encontrado.');

    const bloqueados: StatusContrato[] = ['SAIDA_DA_AGENCIA', 'FINALIZADO'];
    if (bloqueados.includes(atual.statusAtual as StatusContrato)) {
      throw badRequest(
        'Contrato já finalizado (saída registrada ou processo concluído); os dados cadastrais estão travados.',
      );
    }

    const cliente = await prisma.cliente.update({
      where: { id: req.params.id },
      data: dados,
      include: inclusaoResumo,
    });

    await auditar(req, {
      acao: 'CLIENTE_ATUALIZADO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { antes: atual, depois: dados },
    });

    res.json({ cliente });
  }),
);
