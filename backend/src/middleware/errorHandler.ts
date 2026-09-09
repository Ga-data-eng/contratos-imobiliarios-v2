import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: erro.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
  }

  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message, detalhes: erro.detalhes });
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === 'P2002') {
      const alvo = (erro.meta?.target as string[] | string | undefined) ?? 'registro';
      return res.status(409).json({ erro: `Já existe um registro com este valor (${alvo}).` });
    }
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }
    if (erro.code === 'P2003') {
      return res.status(400).json({ erro: 'Referência inválida: registro relacionado não existe.' });
    }
  }

  console.error('[erro não tratado]', erro);
  return res.status(500).json({
    erro: 'Erro interno do servidor.',
    detalhes: env.isProduction ? undefined : String(erro),
  });
}
