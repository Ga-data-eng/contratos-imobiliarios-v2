import { criarApp } from '../src/app';

/**
 * Entrypoint serverless da Vercel.
 *
 * Um app Express e, ele mesmo, um handler `(req, res) => void` compativel
 * com o runtime Node da Vercel — nao precisa de adaptador. `vercel.json`
 * reescreve todas as rotas para esta funcao; o roteamento real continua
 * inteiramente dentro do Express (ver src/routes.ts).
 *
 * O app e criado uma unica vez no escopo do modulo: em invocacoes "quentes"
 * (mesma instancia de lambda reaproveitada) o mesmo PrismaClient e reutilizado,
 * em vez de abrir uma conexao nova a cada requisicao.
 */
export default criarApp();
