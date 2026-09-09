import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Alerta, Carregando, Cartao, TituloSecao, Vazio } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { IconeAlerta } from '../components/icones';
import { haQuantoTempo, plural } from '../lib/formato';
import { CARGO_LABEL, ORIGEM_LABEL, rotuloStatus, type Cargo, type Origem } from '../lib/dominio';
import type { Dashboard as DadosDashboard } from '../lib/tipos';

export default function Dashboard() {
  const { dados, carregando, erro } = useApi<DadosDashboard>('/dashboard');

  if (carregando) return <Carregando />;
  if (erro) return <Alerta tipo="erro">{erro}</Alerta>;
  if (!dados) return null;

  const { resumo, porStatus, porGerente, porOrigem, contratosParados, parametros } = dados;
  const maiorStatus = Math.max(1, ...porStatus.map((s) => s.total));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Painel</h1>
        <p className="text-sm text-slate-600">Situação dos contratos na agência.</p>
      </div>

      {/* ------------------------------------------------------------ indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Total de contratos" valor={resumo.totalContratos} />
        <Indicador rotulo="Em andamento" valor={resumo.emAndamento} destaque="marca" />
        <Indicador rotulo="Assinaturas completas" valor={resumo.assinaturasCompletas} destaque="verde" />
        <Indicador
          rotulo={`Parados +${parametros.diasAlerta}d`}
          valor={resumo.paradosAlerta}
          destaque={resumo.paradosAlerta > 0 ? 'alerta' : undefined}
        />
      </div>

      {resumo.semProtocolo > 0 && (
        <Alerta tipo="info">
          {plural(resumo.semProtocolo, 'contrato cadastrado ainda não teve', 'contratos cadastrados ainda não tiveram')}{' '}
          entrada registrada na agência.{' '}
          <Link to="/contratos?semProtocolo=1" className="font-semibold underline">
            Ver contratos
          </Link>
        </Alerta>
      )}

      {/* ------------------------------------------------------ contratos parados */}
      <section>
        <TituloSecao>
          <span className="inline-flex items-center gap-2">
            <IconeAlerta className="h-5 w-5 text-amber-600" />
            Parados há mais de {parametros.diasAlerta} dias
          </span>
        </TituloSecao>

        {contratosParados.length === 0 ? (
          <Vazio
            titulo="Nenhum contrato parado"
            descricao={`Todos os contratos mudaram de status nos últimos ${parametros.diasAlerta} dias.`}
          />
        ) : (
          <ul className="space-y-2">
            {contratosParados.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/contratos/${c.id}`}
                  className="cartao block p-4 transition hover:border-marca-300 hover:shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{c.nomeCompleto}</p>
                      <p className="text-xs text-slate-500">
                        Contrato {c.numeroContrato} · {c.gerenteResponsavel.nomeCompleto}
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                      {c.diasParado ?? 0} dias parado
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={c.statusAtual} />
                    <span className="text-xs text-slate-500">
                      desde {haQuantoTempo(c.statusDesde)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- por status */}
      <section>
        <TituloSecao>Contratos por status</TituloSecao>
        <Cartao>
          <ul className="space-y-3">
            {porStatus.map((linha) => (
              <li key={linha.status}>
                <Link
                  to={`/contratos?status=${linha.status}`}
                  className="group block"
                  aria-label={`Ver contratos em ${rotuloStatus(linha.status)}`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700 group-hover:text-marca-700">
                      {rotuloStatus(linha.status)}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{linha.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-marca-500"
                      style={{ width: `${(linha.total / maiorStatus) * 100}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      </section>

      {/* ------------------------------------------------ gerente e origem */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <TituloSecao>Por gerente responsável</TituloSecao>
          <Cartao>
            {porGerente.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum contrato cadastrado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {porGerente.map((g) => (
                  <li key={g.gerenteId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{g.nome}</p>
                      <p className="text-xs text-slate-500">
                        {CARGO_LABEL[g.cargo as Cargo] ?? g.cargo}
                      </p>
                    </div>
                    <Link
                      to={`/contratos?gerenteId=${g.gerenteId}`}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-marca-100 hover:text-marca-800"
                    >
                      {g.total}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </section>

        <section>
          <TituloSecao>Por origem do cliente</TituloSecao>
          <Cartao>
            <ul className="divide-y divide-slate-100">
              {porOrigem.map((o) => (
                <li key={o.origem} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-slate-700">
                    {ORIGEM_LABEL[o.origem as Origem] ?? o.origem}
                  </span>
                  <Link
                    to={`/contratos?origem=${o.origem}`}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-marca-100 hover:text-marca-800"
                  >
                    {o.total}
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        </section>
      </div>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: 'marca' | 'verde' | 'alerta';
}) {
  const cor = {
    marca: 'text-marca-700',
    verde: 'text-emerald-700',
    alerta: 'text-amber-700',
  }[destaque ?? 'marca'];

  return (
    <div className="cartao p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${destaque ? cor : 'text-slate-900'}`}>
        {valor}
      </p>
    </div>
  );
}
