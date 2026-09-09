import { Router } from 'express';
import { ah } from '../../lib/asyncHandler';
import { autenticar, sessao } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { montarTimeline } from './historico.service';
import { gerarPdfHistorico } from './historico.pdf';

export const historicoRouter = Router();
historicoRouter.use(autenticar);

/** GET /api/clientes/:clienteId/historico - timeline cronológica. */
historicoRouter.get(
  '/:clienteId/historico',
  ah(async (req, res) => {
    const { cliente, eventos } = await montarTimeline(req.params.clienteId);
    res.json({
      cliente: {
        id: cliente.id,
        nomeCompleto: cliente.nomeCompleto,
        numeroContrato: cliente.numeroContrato,
        numeroProposta: cliente.numeroProposta,
        statusAtual: cliente.statusAtual,
        statusDesde: cliente.statusDesde,
      },
      eventos,
    });
  }),
);

/** GET /api/clientes/:clienteId/historico/pdf - exportação em PDF. */
historicoRouter.get(
  '/:clienteId/historico/pdf',
  ah(async (req, res) => {
    const usuario = sessao(req);
    const { cliente, eventos } = await montarTimeline(req.params.clienteId, true);

    await auditar(req, {
      acao: 'HISTORICO_EXPORTADO_PDF',
      entidadeAfetada: 'Cliente',
      entidadeId: cliente.id,
      detalhes: { numeroContrato: cliente.numeroContrato },
    });

    gerarPdfHistorico(res, { cliente, eventos, geradoPor: `${usuario.nome} (${usuario.email})` });
  }),
);
