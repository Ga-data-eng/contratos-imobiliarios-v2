import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar, sessao } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { badRequest, conflict, notFound } from '../../lib/errors';
import {
  STATUS_FLUXO_CARTORIO_WCPS,
  STATUS_LABEL,
  STATUS_LIBERADOS_PARA_SAIDA,
  STATUS_MANUAIS,
  type StatusContrato,
} from '../../lib/constants';
import { aplicarStatus } from '../../services/contrato.service';

export const protocoloRouter = Router();
protocoloRouter.use(autenticar);

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(''))
  .transform((v) => v || null);

const entradaSchema = z.object({
  clienteId: z.string().uuid('Selecione o contrato.'),
  entreguePor: z.string().trim().min(3, 'Informe quem entregou o contrato.').max(150),
  origem: z
    .string()
    .trim()
    .min(2, 'Informe a origem (cartório, imobiliária, correspondente...).')
    .max(150),
  observacoes: textoOpcional,
});

const saidaSchema = z.object({
  clienteId: z.string().uuid('Selecione o contrato.'),
  recebidoPor: z.string().trim().min(3, 'Informe quem está recebendo o contrato.').max(150),
  destino: z.string().trim().min(2, 'Informe o motivo/destino da saída.').max(150),
  observacoes: textoOpcional,
  /**
   * Saída antes de "TODAS ASSINATURAS COLETADAS" exige justificativa explícita
   * (ex: devolução ao cartório para correção).
   */
  justificativa: textoOpcional,
});

const statusSchema = z.object({
  status: z.enum(STATUS_MANUAIS as [StatusContrato, ...StatusContrato[]], {
    errorMap: () => ({
      message:
        'Status inválido para alteração manual. Entrada, saída e "todas assinaturas coletadas" são controlados pelo sistema.',
    }),
  }),
  observacoes: textoOpcional,
});

/**
 * POST /api/protocolo/entrada
 * Registra a entrada física do contrato na agência e coloca o contrato no
 * status RECEBIDO_NA_AGENCIA.
 */
protocoloRouter.post(
  '/entrada',
  ah(async (req, res) => {
    const dados = entradaSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: dados.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (cliente.statusAtual && cliente.statusAtual !== 'SAIDA_DA_AGENCIA') {
      throw conflict(
        `Este contrato já está na agência (status atual: ${STATUS_LABEL[cliente.statusAtual as StatusContrato]}).`,
      );
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      const criada = await tx.movimentacao.create({
        data: {
          clienteId: dados.clienteId,
          tipo: 'ENTRADA',
          entreguePor: dados.entreguePor,
          usuarioId: usuario.sub,
          recebidoPor: usuario.nome,
          origemDestino: dados.origem,
          observacoes: dados.observacoes,
        },
      });
      await aplicarStatus(tx, {
        clienteId: dados.clienteId,
        statusNovo: 'RECEBIDO_NA_AGENCIA',
        usuarioId: usuario.sub,
        motivo: 'Protocolo de entrada',
        observacoes: dados.observacoes,
      });
      return criada;
    });

    await auditar(req, {
      acao: 'PROTOCOLO_ENTRADA',
      entidadeAfetada: 'Movimentacao',
      entidadeId: movimentacao.id,
      detalhes: { numeroContrato: cliente.numeroContrato, ...dados },
    });

    res.status(201).json({ movimentacao, statusAtual: 'RECEBIDO_NA_AGENCIA' });
  }),
);

/**
 * POST /api/protocolo/saida
 * Registra a saída do contrato (entrega ao cliente, devolução, envio).
 */
protocoloRouter.post(
  '/saida',
  ah(async (req, res) => {
    const dados = saidaSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: dados.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (!cliente.statusAtual) {
      throw conflict('Este contrato ainda não teve entrada registrada na agência.');
    }
    if (cliente.statusAtual === 'SAIDA_DA_AGENCIA') {
      throw conflict('Este contrato já teve a saída registrada.');
    }

    const saidaAntecipada = !STATUS_LIBERADOS_PARA_SAIDA.includes(
      cliente.statusAtual as StatusContrato,
    );
    if (saidaAntecipada && !dados.justificativa) {
      throw badRequest(
        `O contrato está em "${STATUS_LABEL[cliente.statusAtual as StatusContrato]}" e ainda não tem todas as assinaturas. ` +
          'Para registrar a saída mesmo assim, informe uma justificativa.',
        { exigeJustificativa: true },
      );
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      const criada = await tx.movimentacao.create({
        data: {
          clienteId: dados.clienteId,
          tipo: 'SAIDA',
          entreguePor: usuario.nome,
          usuarioId: usuario.sub,
          recebidoPor: dados.recebidoPor,
          origemDestino: dados.destino,
          observacoes: dados.observacoes,
        },
      });
      await aplicarStatus(tx, {
        clienteId: dados.clienteId,
        statusNovo: 'SAIDA_DA_AGENCIA',
        usuarioId: usuario.sub,
        motivo: saidaAntecipada
          ? `Protocolo de saída (antecipada) — ${dados.justificativa}`
          : 'Protocolo de saída',
        observacoes: dados.observacoes,
      });
      return criada;
    });

    await auditar(req, {
      acao: saidaAntecipada ? 'PROTOCOLO_SAIDA_ANTECIPADA' : 'PROTOCOLO_SAIDA',
      entidadeAfetada: 'Movimentacao',
      entidadeId: movimentacao.id,
      detalhes: {
        numeroContrato: cliente.numeroContrato,
        statusAnterior: cliente.statusAtual,
        ...dados,
      },
    });

    res.status(201).json({ movimentacao, statusAtual: 'SAIDA_DA_AGENCIA' });
  }),
);

/**
 * PATCH /api/protocolo/:clienteId/status
 * Mudança manual de status dentro da agência (fila de assinaturas / envio).
 */
protocoloRouter.patch(
  '/:clienteId/status',
  ah(async (req, res) => {
    const dados = statusSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: req.params.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (!cliente.statusAtual) {
      throw conflict('Registre a entrada do contrato na agência antes de alterar o status.');
    }
    if (cliente.statusAtual === 'SAIDA_DA_AGENCIA') {
      throw conflict('Contrato já saiu da agência; o status não pode mais ser alterado.');
    }
    if (STATUS_FLUXO_CARTORIO_WCPS.includes(cliente.statusAtual as StatusContrato)) {
      throw conflict(
        `Contrato em "${STATUS_LABEL[cliente.statusAtual as StatusContrato]}"; use as ações da aba ` +
          '"Pagamento ao Vendedor" para avançar essa etapa, não a alteração manual de status.',
      );
    }

    if (dados.status === 'AGUARDANDO_ENVIO_DEVOLUCAO') {
      const pendentes = await prisma.assinatura.count({
        where: { clienteId: cliente.id, status: { not: 'ASSINADO' } },
      });
      if (pendentes > 0) {
        throw conflict(
          `Ainda há ${pendentes} assinatura(s) pendente(s); colete todas antes de liberar para envio/devolução.`,
        );
      }
    }

    const statusAnterior = cliente.statusAtual;
    await prisma.$transaction((tx) =>
      aplicarStatus(tx, {
        clienteId: cliente.id,
        statusNovo: dados.status,
        usuarioId: usuario.sub,
        motivo: 'Alteração manual de status',
        observacoes: dados.observacoes,
      }),
    );

    await auditar(req, {
      acao: 'STATUS_ALTERADO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { de: statusAnterior, para: dados.status, observacoes: dados.observacoes },
    });

    res.json({ statusAtual: dados.status });
  }),
);

const observacoesSchema = z.object({ observacoes: textoOpcional });

/**
 * POST /api/protocolo/:clienteId/enviar-cartorio
 * Envia o contrato para registro no cartório. Só a partir de
 * TODAS_ASSINATURAS_COLETADAS - etapa linear, não dá para pular.
 */
protocoloRouter.post(
  '/:clienteId/enviar-cartorio',
  ah(async (req, res) => {
    const dados = observacoesSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: req.params.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (cliente.statusAtual !== 'TODAS_ASSINATURAS_COLETADAS') {
      throw conflict(
        'Só é possível enviar para o cartório depois que as 4 assinaturas forem coletadas ' +
          `(status atual: ${STATUS_LABEL[cliente.statusAtual as StatusContrato] ?? 'sem protocolo de entrada'}).`,
      );
    }

    await prisma.$transaction((tx) =>
      aplicarStatus(tx, {
        clienteId: cliente.id,
        statusNovo: 'AGUARDANDO_REGISTRO_CARTORIO',
        usuarioId: usuario.sub,
        motivo: 'Enviado para registro no cartório',
        observacoes: dados.observacoes,
      }),
    );

    await auditar(req, {
      acao: 'CONTRATO_ENVIADO_CARTORIO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { numeroContrato: cliente.numeroContrato, observacoes: dados.observacoes },
    });

    res.json({ statusAtual: 'AGUARDANDO_REGISTRO_CARTORIO' });
  }),
);

/**
 * POST /api/protocolo/:clienteId/confirmar-retorno-cartorio
 * Confirma que o contrato voltou registrado do cartório e o envia para
 * análise/liberação de pagamento no WCPS.
 */
protocoloRouter.post(
  '/:clienteId/confirmar-retorno-cartorio',
  ah(async (req, res) => {
    const dados = observacoesSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: req.params.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (cliente.statusAtual !== 'AGUARDANDO_REGISTRO_CARTORIO') {
      throw conflict(
        'Este contrato não está aguardando registro no cartório ' +
          `(status atual: ${STATUS_LABEL[cliente.statusAtual as StatusContrato] ?? 'sem protocolo de entrada'}).`,
      );
    }

    await prisma.$transaction((tx) =>
      aplicarStatus(tx, {
        clienteId: cliente.id,
        statusNovo: 'AGUARDANDO_PAGAMENTO_WCPS',
        usuarioId: usuario.sub,
        motivo: 'Retorno do cartório confirmado; enviado para pagamento WCPS',
        observacoes: dados.observacoes,
      }),
    );

    await auditar(req, {
      acao: 'CONTRATO_RETORNO_CARTORIO_CONFIRMADO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { numeroContrato: cliente.numeroContrato, observacoes: dados.observacoes },
    });

    res.json({ statusAtual: 'AGUARDANDO_PAGAMENTO_WCPS' });
  }),
);

/**
 * POST /api/protocolo/:clienteId/confirmar-pagamento-wcps
 * Confirma que o WCPS liberou o pagamento ao vendedor. Encerra o processo:
 * o contrato fica FINALIZADO (arquivado fisicamente na agência).
 */
protocoloRouter.post(
  '/:clienteId/confirmar-pagamento-wcps',
  ah(async (req, res) => {
    const dados = observacoesSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({ where: { id: req.params.clienteId } });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (cliente.statusAtual !== 'AGUARDANDO_PAGAMENTO_WCPS') {
      throw conflict(
        'Este contrato não está aguardando pagamento WCPS ' +
          `(status atual: ${STATUS_LABEL[cliente.statusAtual as StatusContrato] ?? 'sem protocolo de entrada'}).`,
      );
    }

    await prisma.$transaction((tx) =>
      aplicarStatus(tx, {
        clienteId: cliente.id,
        statusNovo: 'FINALIZADO',
        usuarioId: usuario.sub,
        motivo: 'Pagamento WCPS confirmado; processo finalizado e contrato arquivado',
        observacoes: dados.observacoes,
      }),
    );

    await auditar(req, {
      acao: 'CONTRATO_PAGAMENTO_WCPS_CONFIRMADO',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { numeroContrato: cliente.numeroContrato, observacoes: dados.observacoes },
    });

    res.json({ statusAtual: 'FINALIZADO' });
  }),
);

/** GET /api/protocolo/movimentacoes?clienteId=&limite= */
protocoloRouter.get(
  '/movimentacoes',
  ah(async (req, res) => {
    const clienteId = z.string().uuid().optional().parse(req.query.clienteId || undefined);
    const limite = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limite || 50);

    const movimentacoes = await prisma.movimentacao.findMany({
      where: clienteId ? { clienteId } : undefined,
      orderBy: { dataHora: 'desc' },
      take: limite,
      include: {
        usuario: { select: { id: true, nomeCompleto: true, cargo: true } },
        cliente: { select: { id: true, nomeCompleto: true, numeroContrato: true } },
      },
    });
    res.json({ movimentacoes });
  }),
);
