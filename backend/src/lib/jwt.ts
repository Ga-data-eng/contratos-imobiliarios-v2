import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Cargo } from './constants';

export interface SessaoUsuario {
  sub: string;
  nome: string;
  email: string;
  cargo: Cargo;
}

export function gerarToken(payload: SessaoUsuario): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}

export function verificarToken(token: string): SessaoUsuario {
  return jwt.verify(token, env.jwtSecret) as SessaoUsuario;
}
