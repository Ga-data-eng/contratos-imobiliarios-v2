import type { NextFunction, Request, Response } from 'express';
import { verificarToken } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';
import { CARGO_LABEL, type Cargo } from '../lib/constants';

/** Exige um token de sessao valido e popula `req.usuario`. */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Token de sessao ausente.'));
  }
  try {
    req.usuario = verificarToken(header.slice('Bearer '.length).trim());
    return next();
  } catch {
    return next(unauthorized('Token de sessao invalido ou expirado.'));
  }
}

/** Restringe a rota a determinados cargos. */
export function exigirCargo(...cargos: Cargo[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(unauthorized());
    if (!cargos.includes(req.usuario.cargo)) {
      return next(
        forbidden(
          `Ação permitida apenas para: ${cargos.map((c) => CARGO_LABEL[c]).join(', ')}. ` +
            `Seu cargo é ${CARGO_LABEL[req.usuario.cargo] ?? req.usuario.cargo}.`,
        ),
      );
    }
    return next();
  };
}

/** Garante o usuario da sessao ou lanca 401 (uso dentro de handlers). */
export function sessao(req: Request) {
  if (!req.usuario) throw unauthorized();
  return req.usuario;
}
