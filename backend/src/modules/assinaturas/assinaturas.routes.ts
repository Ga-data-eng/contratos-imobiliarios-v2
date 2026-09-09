import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar, sessao } from '../../middleware/auth';
import { auditar } from '../../lib/audit';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { dataHoraBR } from '../../lib/datas';
import {
  CARGOS_AUTORIZADOS_POR_ASSINATURA,
  CARGO_LABEL,
  TIPOS_ASSINATURA,
  TIPO_ASSINATURA_LABEL,
  type Cargo,
  type TipoAssinatura,
} from '../../lib/constants';
import { aplicarStatus, statusPelasAssinaturas } from '../../services/contrato.service';

export const assinaturasRouter = Router();
assinaturasRouter.use(autenticar);

/** data URL de imagem PNG/JPEG produzida pelo canvas de assinatura. */
const dataUrlImagem = z
  .string()
  .min(100, 'Assinatura vazia: desenhe a assinatura antes de confirmar.')
  .max(2_000_000, 'Imagem da assinatura muito grande.')
  .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, 'Formato de assinatura inválido.');

const assinarSchema = z.object({
  tipo: z.enum(TIPOS_ASSINATURA, {
    errorMap: () => ({ message: 'Tipo de assinatura inválido.' }),
  }),
  responsavelNome: z.string().trim().min(3, 'Informe o nome do responsável.').max(150),
  responsavelEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(150)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
  assinaturaDigital: dataUrlImagem,
});

/** GET /api/clientes/:clienteId/assinaturas */
assinaturasRouter.get(
  '/:clienteId/assinaturas',
  ah(async (req, res) => {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.clienteId },
      select: { id: true, nomeCompleto: true, numeroContrato: true, statusAtual: true },
    });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');

    const assinaturas = await prisma.assinatura.findMany({
      where: { clienteId: cliente.id },
      include: { usuario: { select: { id: true, nomeCompleto: true, cargo: true } } },
    });

    res.json({ cliente, assinaturas });
  }),
);

/**
 * POST /api/clientes/:clienteId/assinaturas
 * Registra uma das 4 assinaturas. Regras:
 *  - o cargo do usuário logado precisa estar autorizado para aquele campo;
 *  - assinatura já coletada é imutável (409);
 *  - o contrato precisa estar na agência;
 *  - após gravar, o status avança automaticamente para a próxima assinatura
 *    pendente ou para TODAS_ASSINATURAS_COLETADAS.
 */
assinaturasRouter.post(
  '/:clienteId/assinaturas',
  ah(async (req, res) => {
    const dados = assinarSchema.parse(req.body);
    const usuario = sessao(req);

    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.clienteId },
      include: { assinaturas: true },
    });
    if (!cliente) throw notFound('Cliente/contrato não encontrado.');
    if (!cliente.statusAtual) {
      throw conflict('Registre a entrada do contrato na agência antes de coletar assinaturas.');
    }
    if (cliente.statusAtual === 'SAIDA_DA_AGENCIA') {
      throw conflict('Contrato já saiu da agência; não é possível coletar novas assinaturas.');
    }

    const tipo = dados.tipo as TipoAssinatura;
    const cargosPermitidos = CARGOS_AUTORIZADOS_POR_ASSINATURA[tipo];
    if (!cargosPermitidos.includes(usuario.cargo as Cargo)) {
      throw forbidden(
        `A assinatura "${TIPO_ASSINATURA_LABEL[tipo]}" só pode ser registrada por: ` +
          `${cargosPermitidos.map((c) => CARGO_LABEL[c]).join(', ')}. ` +
          `Seu cargo é ${CARGO_LABEL[usuario.cargo as Cargo]}.`,
      );
    }

    const existente = cliente.assinaturas.find((a) => a.tipo === tipo);
    if (existente?.status === 'ASSINADO') {
      throw conflict(
        `A assinatura "${TIPO_ASSINATURA_LABEL[tipo]}" já foi coletada em ` +
          `${dataHoraBR(existente.dataHora)} e não pode ser alterada.`,
      );
    }

    const agora = new Date();

    const { assinatura, statusFinal } = await prisma.$transaction(async (tx) => {
      const dadosAssinatura = {
        status: 'ASSINADO',
        responsavelNome: dados.responsavelNome,
        responsavelEmail: dados.responsavelEmail,
        usuarioId: usuario.sub,
        assinaturaDigital: dados.assinaturaDigital,
        dataHora: agora,
      };

      const salva = existente
        ? await tx.assinatura.update({ where: { id: existente.id }, data: dadosAssinatura })
        : await tx.assinatura.create({ data: { clienteId: cliente.id, tipo, ...dadosAssinatura } });

      const todas = await tx.assinatura.findMany({
        where: { clienteId: cliente.id },
        select: { tipo: true, status: true },
      });

      const statusNovo = statusPelasAssinaturas(todas);
      await aplicarStatus(tx, {
        clienteId: cliente.id,
        statusNovo,
        usuarioId: usuario.sub,
        motivo: `Assinatura registrada: ${TIPO_ASSINATURA_LABEL[tipo]}`,
      });

      return { assinatura: salva, statusFinal: statusNovo };
    });

    await auditar(req, {
      acao: 'ASSINATURA_REGISTRADA',
      entidadeAfetada: 'Assinatura',
      entidadeId: assinatura.id,
      detalhes: {
        clienteId: cliente.id,
        numeroContrato: cliente.numeroContrato,
        tipo,
        responsavelNome: dados.responsavelNome,
        responsavelEmail: dados.responsavelEmail,
        statusResultante: statusFinal,
      },
    });

    // A imagem não volta na resposta: é grande e o cliente acabou de enviá-la.
    const { assinaturaDigital: _omitida, ...semImagem } = assinatura;
    res.status(201).json({ assinatura: semImagem, statusAtual: statusFinal });
  }),
);
