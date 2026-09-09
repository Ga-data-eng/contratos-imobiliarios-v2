import type { SessaoUsuario } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware `autenticar`. */
      usuario?: SessaoUsuario;
    }
  }
}

export {};
