import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { gerarToken } from '../../lib/jwt';
import { auditar, registrarAuditoria } from '../../lib/audit';
import { autenticar, sessao } from '../../middleware/auth';
import { CARGOS, type Cargo } from '../../lib/constants';
import { notFound } from '../../lib/errors';

export const authRouter = Router();

const loginSchema = z.object({
  nomeCompleto: z
    .string()
    .trim()
    .min(3, 'Informe o nome completo.')
    .max(120)
    .refine((v) => v.includes(' '), 'Informe nome e sobrenome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(150),
  cargo: z.enum(CARGOS, { errorMap: () => ({ message: 'Selecione um cargo válido.' }) }),
});

/**
 * GET /api/auth/lookup?email=...
 * Consulta pública usada pela tela de login para pré-preencher nome e cargo
 * de um usuário já cadastrado. Não devolve token.
 */
authRouter.get(
  '/lookup',
  ah(async (req, res) => {
    const email = z.string().trim().toLowerCase().email().parse(req.query.email);
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { nomeCompleto: true, email: true, cargo: true },
    });
    res.json({ encontrado: Boolean(usuario), usuario: usuario ?? null });
  }),
);

/**
 * POST /api/auth/login
 * Login sem senha. Primeiro acesso cadastra o usuário; acessos seguintes
 * reconhecem pelo e-mail e devolvem nome/cargo já cadastrados.
 */
authRouter.post(
  '/login',
  ah(async (req, res) => {
    const dados = loginSchema.parse(req.body);

    const existente = await prisma.usuario.findUnique({ where: { email: dados.email } });

    let usuario = existente;
    let primeiroAcesso = false;
    let divergencia: { nomeInformado?: string; cargoInformado?: Cargo } | undefined;

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: { nomeCompleto: dados.nomeCompleto, email: dados.email, cargo: dados.cargo },
      });
      primeiroAcesso = true;
    } else {
      // O cadastro já existente prevalece (requisito: "recupera nome/cargo já
      // cadastrados"). Divergências são registradas na auditoria.
      const nomeDivergente = usuario.nomeCompleto !== dados.nomeCompleto;
      const cargoDivergente = usuario.cargo !== dados.cargo;
      if (nomeDivergente || cargoDivergente) {
        divergencia = {
          nomeInformado: nomeDivergente ? dados.nomeCompleto : undefined,
          cargoInformado: cargoDivergente ? dados.cargo : undefined,
        };
      }
    }

    const token = gerarToken({
      sub: usuario.id,
      nome: usuario.nomeCompleto,
      email: usuario.email,
      cargo: usuario.cargo as Cargo,
    });

    await registrarAuditoria(
      req,
      { id: usuario.id, nome: usuario.nomeCompleto, email: usuario.email, cargo: usuario.cargo },
      {
        acao: primeiroAcesso ? 'LOGIN_PRIMEIRO_ACESSO' : 'LOGIN',
        entidadeAfetada: 'Usuario',
        entidadeId: usuario.id,
        detalhes: divergencia
          ? { aviso: 'Dados informados divergem do cadastro; cadastro prevaleceu.', ...divergencia }
          : undefined,
      },
    );

    res.status(primeiroAcesso ? 201 : 200).json({
      token,
      primeiroAcesso,
      divergencia: divergencia ?? null,
      usuario: {
        id: usuario.id,
        nomeCompleto: usuario.nomeCompleto,
        email: usuario.email,
        cargo: usuario.cargo,
      },
    });
  }),
);

/** GET /api/auth/me - dados do usuário da sessão atual. */
authRouter.get(
  '/me',
  autenticar,
  ah(async (req, res) => {
    const atual = sessao(req);
    const usuario = await prisma.usuario.findUnique({
      where: { id: atual.sub },
      select: { id: true, nomeCompleto: true, email: true, cargo: true, criadoEm: true },
    });
    if (!usuario) throw notFound('Usuário da sessão não existe mais.');
    res.json({ usuario });
  }),
);

/** POST /api/auth/logout - encerra a sessão (o token é descartado no cliente). */
authRouter.post(
  '/logout',
  autenticar,
  ah(async (req, res) => {
    await auditar(req, { acao: 'LOGOUT', entidadeAfetada: 'Usuario', entidadeId: sessao(req).sub });
    res.status(204).end();
  }),
);
