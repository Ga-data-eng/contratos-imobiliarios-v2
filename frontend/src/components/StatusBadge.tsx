import { STATUS_CLASSE, rotuloStatus, type StatusContrato } from '../lib/dominio';

export function StatusBadge({ status, className = '' }: { status: string | null; className?: string }) {
  const estilo = status
    ? (STATUS_CLASSE[status as StatusContrato] ?? 'bg-slate-100 text-slate-700 ring-slate-200')
    : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilo} ${className}`}
    >
      {rotuloStatus(status)}
    </span>
  );
}

/** Contador compacto de assinaturas coletadas (ex: "2/4 assinaturas"). */
export function ProgressoAssinaturas({ coletadas, total = 4 }: { coletadas: number; total?: number }) {
  const completo = coletadas >= total;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${completo ? 'text-emerald-700' : 'text-slate-600'}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i < coletadas ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
        ))}
      </span>
      {coletadas}/{total} assinaturas
    </span>
  );
}
