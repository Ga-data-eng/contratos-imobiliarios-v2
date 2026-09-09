import 'dotenv/config';

function obrigatorio(nome: string, padrao?: string): string {
  const valor = process.env[nome] ?? padrao;
  if (!valor) {
    throw new Error(
      `Variavel de ambiente ${nome} nao definida. Copie backend/.env.example para backend/.env.`,
    );
  }
  return valor;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = obrigatorio(
  'JWT_SECRET',
  nodeEnv === 'production' ? undefined : 'dev-secret-nao-usar-em-producao',
);

if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET precisa ter ao menos 32 caracteres em producao.');
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: obrigatorio('DATABASE_URL', 'file:./dev.db'),
  /** "sqlite" ou "postgresql" - usado para ajustar buscas case-insensitive. */
  databaseProvider: (process.env.DATABASE_PROVIDER ?? 'sqlite') as 'sqlite' | 'postgresql',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  alertaDiasParado: Number(process.env.ALERTA_DIAS_PARADO ?? 5),
};
