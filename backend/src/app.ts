import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function criarApp() {
  const app = express();

  app.set('trust proxy', true);

  app.use(
    cors({
      origin: (origem, callback) => {
        // Requisições sem Origin (curl, apps nativos) são liberadas.
        if (!origem || env.corsOrigins.includes(origem) || env.corsOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`Origem não autorizada pelo CORS: ${origem}`));
      },
      credentials: true,
    }),
  );

  // Assinaturas manuscritas chegam como data URL base64; o limite padrão de
  // 100kb do Express não é suficiente.
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '8mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
