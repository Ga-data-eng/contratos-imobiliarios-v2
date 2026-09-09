import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, EVENTO_SESSAO_EXPIRADA, limparToken, salvarToken, tokenSalvo } from '../lib/api';
import type { Usuario } from '../lib/tipos';
import type { Cargo } from '../lib/dominio';

interface RespostaLogin {
  token: string;
  primeiroAcesso: boolean;
  divergencia: { nomeInformado?: string; cargoInformado?: Cargo } | null;
  usuario: Usuario;
}

interface AuthContexto {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (dados: { nomeCompleto: string; email: string; cargo: Cargo }) => Promise<RespostaLogin>;
  sair: () => Promise<void>;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Revalida o token guardado no localStorage ao abrir o app.
  useEffect(() => {
    let ativo = true;
    if (!tokenSalvo()) {
      setCarregando(false);
      return;
    }
    api<{ usuario: Usuario }>('/auth/me', { semRedirecionar: true })
      .then((r) => ativo && setUsuario(r.usuario))
      .catch(() => {
        limparToken();
        if (ativo) setUsuario(null);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  // Qualquer 401 vindo da API encerra a sessão local.
  useEffect(() => {
    const aoExpirar = () => setUsuario(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const entrar = useCallback(
    async (dados: { nomeCompleto: string; email: string; cargo: Cargo }) => {
      const resposta = await api<RespostaLogin>('/auth/login', {
        metodo: 'POST',
        corpo: dados,
        semRedirecionar: true,
      });
      salvarToken(resposta.token);
      setUsuario(resposta.usuario);
      return resposta;
    },
    [],
  );

  const sair = useCallback(async () => {
    try {
      await api('/auth/logout', { metodo: 'POST', semRedirecionar: true });
    } finally {
      limparToken();
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}

/** Usuário garantido — para telas que só renderizam autenticadas. */
export function useUsuario(): Usuario {
  const { usuario } = useAuth();
  if (!usuario) throw new Error('Tela autenticada renderizada sem usuário.');
  return usuario;
}
