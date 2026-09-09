import { useEffect, type ReactNode } from 'react';
import { Botao } from './ui';

interface Props {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar?: string;
  varianteConfirmar?: 'primario' | 'perigo';
  processando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmação explícita exigida para ações críticas (saída de contrato,
 * assinatura, exclusão de cadastro).
 */
export function ConfirmDialog({
  aberto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  varianteConfirmar = 'primario',
  processando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processando) onCancelar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto, processando, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
        <div className="mt-2 space-y-2 text-sm text-slate-600">{children}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao variante="secundario" onClick={onCancelar} disabled={processando}>
            Cancelar
          </Botao>
          <Botao variante={varianteConfirmar} onClick={onConfirmar} carregando={processando}>
            {textoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}
