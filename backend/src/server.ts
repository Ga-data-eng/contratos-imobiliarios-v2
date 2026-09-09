import { criarApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = criarApp();

const servidor = app.listen(env.port, () => {
  console.log('\n  API do Controle de Contratos rodando');
  console.log(`  http://localhost:${env.port}/api/health`);
  console.log(`  banco: ${env.databaseProvider}  |  ambiente: ${env.nodeEnv}\n`);
});

function encerrar(sinal: string) {
  console.log(`\n[${sinal}] encerrando servidor...`);
  servidor.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
