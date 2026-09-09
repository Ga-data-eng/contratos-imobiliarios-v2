import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
}

/**
 * GET com estado de carregamento/erro e função de recarga.
 * `caminho` nulo adia a requisição (útil quando depende de outro dado).
 */
export function useApi<T>(caminho: string | null, deps: unknown[] = []) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: true, erro: null });
  const [gatilho, setGatilho] = useState(0);

  const recarregar = useCallback(() => setGatilho((n) => n + 1), []);

  useEffect(() => {
    if (!caminho) {
      setEstado({ dados: null, carregando: false, erro: null });
      return;
    }
    let ativo = true;
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));

    api<T>(caminho)
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro: unknown) => {
        if (!ativo) return;
        const mensagem =
          erro instanceof ApiError ? erro.message : 'Não foi possível carregar os dados.';
        setEstado({ dados: null, carregando: false, erro: mensagem });
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, gatilho, ...deps]);

  return { ...estado, recarregar };
}

/** Debounce simples para o campo de busca. */
export function useDebounce<T>(valor: T, atraso = 350): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), atraso);
    return () => clearTimeout(id);
  }, [valor, atraso]);
  return debounced;
}
