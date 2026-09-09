import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { Alerta, Botao, Carregando, Vazio } from '../components/ui';
import { IconePdf, IconeVoltar } from '../components/icones';
import { baixarArquivo } from '../lib/api';
import { dataHora } from '../lib/formato';
import type { EventoTimeline } from '../lib/tipos';

interface Resposta {
  cliente: {
    id: string;
    nomeCompleto: string;
    numeroContrato: string;
    numeroProposta: string;
    statusAtual: string | null;
    statusDesde: string | null;
  };
  eventos: EventoTimeline[];
}

const COR_EVENTO: Record<EventoTimeline['tipo'], string> = {
  CADASTRO: 'bg-slate-400',
  ENTRADA: 'bg-sky-500',
  SAIDA: 'bg-slate-700',
  STATUS: 'bg-marca-500',
  ASSINATURA: 'bg-emerald-500',
};

const ROTULO_EVENTO: Record<EventoTimeline['tipo'], string> = {
  CADASTRO: 'Cadastro',
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  STATUS: 'Status',
  ASSINATURA: 'Assinatura',
};

export default function Historico() {
  const { id } = useParams();
  const toast = useToast();
  const { dados, carregando, erro } = useApi<Resposta>(`/clientes/${id}/historico`);

  if (carregando) return <Carregando />;
  if (erro) return <Alerta tipo="erro">{erro}</Alerta>;
  if (!dados) return null;

  const { cliente, eventos } = dados;

  async function exportar() {
    try {
      await baixarArquivo(
        `/clientes/${cliente.id}/historico/pdf`,
        `historico-contrato-${cliente.numeroContrato}.pdf`,
      );
    } catch {
      toast.erro('Não foi possível gerar o PDF.');
    }
  }

  return (
    <div className="space-y-5">
      <Link
        to={`/contratos/${cliente.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-marca-700"
      >
        <IconeVoltar className="h-4 w-4" />
        Voltar ao contrato
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Histórico e auditoria</h1>
          <p className="text-sm text-slate-600">
            {cliente.nomeCompleto} · Contrato {cliente.numeroContrato}
          </p>
          <div className="mt-2">
            <StatusBadge status={cliente.statusAtual} />
          </div>
        </div>
        <Botao variante="secundario" onClick={exportar}>
          <IconePdf className="h-4 w-4" />
          Exportar PDF
        </Botao>
      </div>

      <Alerta tipo="info">
        Os registros abaixo são imutáveis: nenhum usuário do sistema pode editá-los ou apagá-los.
      </Alerta>

      {eventos.length === 0 ? (
        <Vazio titulo="Sem eventos registrados" />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
          {eventos.map((evento) => (
            <li key={evento.id} className="relative">
              <span
                className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-slate-100 ${COR_EVENTO[evento.tipo]}`}
                aria-hidden
              />
              <div className="cartao p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {ROTULO_EVENTO[evento.tipo]}
                  </span>
                  <time className="text-xs tabular-nums text-slate-500" dateTime={evento.dataHora}>
                    {dataHora(evento.dataHora)}
                  </time>
                </div>
                <p className="mt-2 font-semibold text-slate-900">{evento.titulo}</p>
                <p className="mt-0.5 text-sm text-slate-700">{evento.descricao}</p>
                {evento.observacoes && (
                  <p className="mt-1 text-xs text-slate-500">Obs.: {evento.observacoes}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {evento.usuarioNome}
                  {evento.usuarioCargo ? ` — ${evento.usuarioCargo}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
