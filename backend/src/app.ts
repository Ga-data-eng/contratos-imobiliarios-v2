import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Compara a origem da requisição contra CORS_ORIGIN. Cada entrada pode ser
 * uma origem exata ou usar um único "*" como curinga de um nível de
 * subdomínio (ex.: "https://*.vercel.app" cobre as URLs de preview deploy do
 * Vercel, que variam a cada branch/PR).
 */
function origemPermitida(origem: string): boolean {
  return env.corsOrigins.some((padrao) => {
    if (padrao === '*' || padrao === origem) return true;
    if (!padrao.includes('*')) return false;
    const regex = new RegExp(`^${padrao.split('*').map(escaparRegex).join('[^./]+')}$`);
    return regex.test(origem);
  });
}

export function criarApp() {
  const app = express();

  app.set('trust proxy', true);

  app.use(
    cors({
      origin: (origem, callback) => {
        // Requisições sem Origin (curl, apps nativos) são liberadas.
        if (!origem || origemPermitida(origem)) return callback(null, true);
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
