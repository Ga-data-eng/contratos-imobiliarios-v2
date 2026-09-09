import type { Request } from 'express';
import { prisma } from './prisma';
import type { Cargo } from './constants';

export interface AtorAuditoria {
  id?: string | null;
  nome: string;
  email: string;
  cargo: Cargo | string;
}

export interface EntradaAuditoria {
  acao: string;
  entidadeAfetada: string;
  entidadeId?: string | null;
  detalhes?: unknown;
}

export function extrairIp(req: Request): string {
  const encaminhado = req.headers['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.length > 0) {
    return encaminhado.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

/**
 * Grava uma linha no log de auditoria. Append-only: nao existe caminho de
 * update/delete (ver src/lib/prisma.ts).
 *
 * Falhas de auditoria nunca derrubam a requisicao principal - sao reportadas
 * no console para nao mascarar a acao do usuario.
 */
export async function registrarAuditoria(
  req: Request,
  ator: AtorAuditoria,
  entrada: EntradaAuditoria,
): Promise<void> {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: ator.id ?? null,
        usuarioNome: ator.nome,
        usuarioEmail: ator.email,
        usuarioCargo: String(ator.cargo),
        acao: entrada.acao,
        entidadeAfetada: entrada.entidadeAfetada,
        entidadeId: entrada.entidadeId ?? null,
        detalhes: entrada.detalhes === undefined ? null : JSON.stringify(entrada.detalhes),
        ip: extrairIp(req),
        userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
      },
    });
  } catch (erro) {
    console.error('[auditoria] falha ao registrar log:', erro);
  }
}

/** Atalho para rotas autenticadas, que ja possuem `req.usuario`. */
export async function auditar(req: Request, entrada: EntradaAuditoria): Promise<void> {
  const usuario = req.usuario;
  if (!usuario) return;
  await registrarAuditoria(
    req,
    { id: usuario.sub, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo },
    entrada,
  );
}
