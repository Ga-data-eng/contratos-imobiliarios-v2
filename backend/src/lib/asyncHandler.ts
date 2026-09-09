import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Encaminha rejeicoes de handlers async para o errorHandler do Express 4. */
export function ah(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
