/**
 * Cliente HTTP da API.
 *
 * Em desenvolvimento o Vite faz proxy de /api para o backend (vite.config.ts),
 * então basta o caminho relativo. Em produção defina VITE_API_URL.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CHAVE_TOKEN = 'contratos.token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalhes?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenSalvo = () => localStorage.getItem(CHAVE_TOKEN);
export const salvarToken = (token: string) => localStorage.setItem(CHAVE_TOKEN, token);
export const limparToken = () => localStorage.removeItem(CHAVE_TOKEN);

/** Disparado quando a API responde 401 — o AuthContext escuta e desloga. */
export const EVENTO_SESSAO_EXPIRADA = 'contratos:sessao-expirada';

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  /** Requisições da tela de login não devem disparar o logout global. */
  semRedirecionar?: boolean;
}

export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = tokenSalvo();
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: opcoes.metodo ?? 'GET',
    headers: {
      ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
  });

  if (resposta.status === 401 && !opcoes.semRedirecionar) {
    limparToken();
    window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    const mensagem =
      dados?.erro ??
      (Array.isArray(dados?.detalhes)
        ? dados.detalhes.map((d: { mensagem: string }) => d.mensagem).join(' ')
        : null) ??
      `Erro ${resposta.status} ao chamar a API.`;
    throw new ApiError(resposta.status, mensagem, dados?.detalhes);
  }

  return dados as T;
}

/** Download autenticado de arquivo (usado no PDF do histórico). */
export async function baixarArquivo(caminho: string, nomeArquivo: string) {
  const token = tokenSalvo();
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resposta.ok) {
    throw new ApiError(resposta.status, 'Não foi possível gerar o arquivo.');
  }
  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
