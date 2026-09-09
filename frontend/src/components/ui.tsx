import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const VARIANTE: Record<Variante, string> = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 focus:ring-marca-300',
  secundario: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200',
  perigo: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
  fantasma: 'bg-transparent text-marca-700 hover:bg-marca-50 focus:ring-marca-200',
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
}

export function Botao({
  variante = 'primario',
  carregando = false,
  larguraTotal = false,
  className = '',
  children,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={`toque inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold
        shadow-sm transition focus:outline-none focus:ring-2
        disabled:cursor-not-allowed disabled:opacity-60
        ${VARIANTE[variante]} ${larguraTotal ? 'w-full' : ''} ${className}`}
    >
      {carregando && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

interface CampoProps {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  obrigatorio?: boolean;
  children: ReactNode;
}

export function Campo({ rotulo, erro, dica, obrigatorio, children }: CampoProps) {
  return (
    <div>
      <label className="rotulo">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {dica && !erro && <p className="mt-1 text-xs text-slate-500">{dica}</p>}
      {erro && <p className="mt-1 text-xs font-medium text-red-600">{erro}</p>}
    </div>
  );
}

export const Entrada = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`campo ${props.className ?? ''}`} />
);

export const Selecao = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`campo ${props.className ?? ''}`} />
);

export const AreaTexto = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`campo min-h-[88px] ${props.className ?? ''}`} />
);

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cartao p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {acao}
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-medium text-slate-700">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-slate-500">{descricao}</p>}
      {acao}
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-marca-600"
        aria-hidden
      />
      {texto}
    </div>
  );
}

export function Alerta({
  tipo = 'aviso',
  children,
}: {
  tipo?: 'aviso' | 'erro' | 'info';
  children: ReactNode;
}) {
  const estilo = {
    aviso: 'bg-amber-50 text-amber-900 border-amber-200',
    erro: 'bg-red-50 text-red-900 border-red-200',
    info: 'bg-marca-50 text-marca-900 border-marca-200',
  }[tipo];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${estilo}`}>{children}</div>;
}

/** Par rótulo/valor usado nas fichas — empilha no celular. */
export function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}
