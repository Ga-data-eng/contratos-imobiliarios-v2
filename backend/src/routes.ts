import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { usuariosRouter } from './modules/usuarios/usuarios.routes';
import { parceirosRouter } from './modules/parceiros/parceiros.routes';
import { empreendimentosRouter } from './modules/empreendimentos/empreendimentos.routes';
import { clientesRouter } from './modules/clientes/clientes.routes';
import { protocoloRouter } from './modules/protocolo/protocolo.routes';
import { assinaturasRouter } from './modules/assinaturas/assinaturas.routes';
import { historicoRouter } from './modules/historico/historico.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { auditoriaRouter } from './modules/auditoria/auditoria.routes';
import {
  CARGOS,
  CARGO_LABEL,
  CARGOS_AUTORIZADOS_POR_ASSINATURA,
  ORIGENS_CLIENTE,
  STATUS_CONTRATO,
  STATUS_LABEL,
  STATUS_MANUAIS,
  TIPOS_ASSINATURA,
  TIPO_ASSINATURA_LABEL,
} from './lib/constants';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', hora: new Date().toISOString() });
});

/** Dicionários de domínio consumidos pelo frontend (labels e permissões). */
apiRouter.get('/metadados', (_req, res) => {
  res.json({
    cargos: CARGOS.map((c) => ({ valor: c, label: CARGO_LABEL[c] })),
    status: STATUS_CONTRATO.map((s) => ({ valor: s, label: STATUS_LABEL[s] })),
    statusManuais: STATUS_MANUAIS,
    origens: ORIGENS_CLIENTE,
    tiposAssinatura: TIPOS_ASSINATURA.map((t) => ({
      valor: t,
      label: TIPO_ASSINATURA_LABEL[t],
      cargosAutorizados: CARGOS_AUTORIZADOS_POR_ASSINATURA[t],
    })),
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/parceiros', parceirosRouter);
apiRouter.use('/empreendimentos', empreendimentosRouter);
apiRouter.use('/protocolo', protocoloRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/auditoria', auditoriaRouter);

// Rotas aninhadas em /clientes (assinaturas e histórico) vêm antes do CRUD
// para que o parâmetro /:id não capture os sufixos.
apiRouter.use('/clientes', assinaturasRouter);
apiRouter.use('/clientes', historicoRouter);
apiRouter.use('/clientes', clientesRouter);
