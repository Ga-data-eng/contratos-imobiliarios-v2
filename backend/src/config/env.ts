import 'dotenv/config';

/**
 * Le uma variavel de ambiente tratando string vazia/só espaços como ausente.
 * Necessário porque `??` só cai no padrão quando o valor é `undefined`/`null`
 * — um provedor de hospedagem que grava a variável como string vazia (por um
 * paste malformado, por exemplo) passaria batido e quebraria em silêncio mais
 * adiante (ex.: `expiresIn: ''` no jsonwebtoken).
 */
function opcional(nome: string, padrao: string): string {
  const valor = process.env[nome]?.trim();
  return valor ? valor : padrao;
}

function obrigatorio(nome: string, padrao?: string): string {
  const valor = process.env[nome]?.trim() || padrao;
  if (!valor) {
    throw new Error(
      `Variavel de ambiente ${nome} nao definida. Copie backend/.env.example para backend/.env.`,
    );
  }
  return valor;
}

const nodeEnv = opcional('NODE_ENV', 'development');
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
  port: Number(opcional('PORT', '3333')),
  databaseUrl: obrigatorio('DATABASE_URL', 'file:./dev.db'),
  /** "sqlite" ou "postgresql" - usado para ajustar buscas case-insensitive. */
  databaseProvider: opcional('DATABASE_PROVIDER', 'sqlite') as 'sqlite' | 'postgresql',
  jwtSecret,
  jwtExpiresIn: opcional('JWT_EXPIRES_IN', '8h'),
  corsOrigins: opcional('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  alertaDiasParado: Number(opcional('ALERTA_DIAS_PARADO', '5')),
};
