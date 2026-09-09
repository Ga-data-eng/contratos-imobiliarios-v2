/** Erro de negocio com status HTTP explicito. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string, detalhes?: unknown) => new HttpError(400, msg, detalhes);
export const unauthorized = (msg = 'Sessao invalida ou expirada.') => new HttpError(401, msg);
export const forbidden = (msg: string) => new HttpError(403, msg);
export const notFound = (msg: string) => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
