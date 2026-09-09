import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/asyncHandler';
import { autenticar } from '../../middleware/auth';
import { CARGOS } from '../../lib/constants';

export const usuariosRouter = Router();

usuariosRouter.use(autenticar);

/**
 * GET /api/usuarios
 * Lista usuários cadastrados. Alimenta o select "gerente responsável" do
 * cadastro de cliente.
 */
usuariosRouter.get(
  '/',
  ah(async (req, res) => {
    const cargo = z.enum(CARGOS).optional().parse(req.query.cargo || undefined);
    const usuarios = await prisma.usuario.findMany({
      where: { ativo: true, ...(cargo ? { cargo } : {}) },
      orderBy: { nomeCompleto: 'asc' },
      select: { id: true, nomeCompleto: true, email: true, cargo: true },
    });
    res.json({ usuarios });
  }),
);
