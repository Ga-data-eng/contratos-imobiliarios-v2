import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Tipo = 'sucesso' | 'erro' | 'aviso';

interface Toast {
  id: number;
  tipo: Tipo;
  mensagem: string;
}

interface ToastContexto {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  aviso: (mensagem: string) => void;
}

const Contexto = createContext<ToastContexto | null>(null);

const ESTILO: Record<Tipo, string> = {
  sucesso: 'bg-emerald-600',
  erro: 'bg-red-600',
  aviso: 'bg-amber-600',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const adicionar = useCallback((tipo: Tipo, mensagem: string) => {
    const id = Date.now() + Math.random();
    setToasts((atual) => [...atual, { id, tipo, mensagem }]);
    // Mensagens de erro ficam mais tempo na tela: costumam ser mais longas.
    setTimeout(() => setToasts((atual) => atual.filter((t) => t.id !== id)), tipo === 'erro' ? 7000 : 4000);
  }, []);

  const valor = useMemo<ToastContexto>(
    () => ({
      sucesso: (m) => adicionar('sucesso', m),
      erro: (m) => adicionar('erro', m),
      aviso: (m) => adicionar('aviso', m),
    }),
    [adicionar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-3"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-md rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${ESTILO[t.tipo]}`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}
