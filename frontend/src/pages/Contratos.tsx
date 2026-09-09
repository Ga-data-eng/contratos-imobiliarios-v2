import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi, useDebounce } from '../hooks/useApi';
import { Alerta, Botao, Campo, Carregando, Entrada, Selecao, Vazio } from '../components/ui';
import { ProgressoAssinaturas, StatusBadge } from '../components/StatusBadge';
import { IconeMais } from '../components/icones';
import { data, haQuantoTempo } from '../lib/formato';
import { ORIGEM_LABEL, ORIGENS, STATUS_CONTRATO, rotuloStatus } from '../lib/dominio';
import type { Contrato, Empreendimento, Paginacao, Parceiro, Usuario } from '../lib/tipos';

interface Resposta {
  clientes: Contrato[];
  paginacao: Paginacao;
}

export default function Contratos() {
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState(params.get('q') ?? '');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const buscaDebounced = useDebounce(busca);

  const pagina = Number(params.get('page') ?? 1);

  /** Atualiza um filtro na URL, voltando sempre para a primeira página. */
  function definir(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    if (chave !== 'page') novo.delete('page');
    setParams(novo, { replace: true });
  }

  const consulta = useMemo(() => {
    const q = new URLSearchParams(params);
    if (buscaDebounced.trim()) q.set('q', buscaDebounced.trim());
    else q.delete('q');
    q.set('pageSize', '20');
    return q.toString();
  }, [params, buscaDebounced]);

  const { dados, carregando, erro } = useApi<Resposta>(`/clientes?${consulta}`);
  const { dados: usuarios } = useApi<{ usuarios: Usuario[] }>('/usuarios');
  const { dados: empreendimentos } = useApi<{ empreendimentos: Empreendimento[] }>('/empreendimentos');
  const { dados: parceiros } = useApi<{ parceiros: Parceiro[] }>('/parceiros');

  const filtrosAtivos = ['status', 'origem', 'gerenteId', 'empreendimentoId', 'parceiroId', 'semProtocolo']
    .filter((c) => params.get(c))
    .length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-600">Consulta de clientes e contratos.</p>
        </div>
        <Link to="/contratos/novo">
          <Botao>
            <IconeMais className="h-4 w-4" />
            Novo
          </Botao>
        </Link>
      </div>

      {/* -------------------------------------------------------------- busca */}
      <div className="space-y-3">
        <Entrada
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, contrato, proposta, empreendimento, parceiro ou gerente"
          aria-label="Buscar contratos"
        />

        <button
          onClick={() => setFiltrosAbertos((v) => !v)}
          className="toque flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 lg:w-auto lg:gap-3"
        >
          <span>Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}</span>
          <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
        </button>

        {filtrosAbertos && (
          <div className="cartao grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="Status">
              <Selecao value={params.get('status') ?? ''} onChange={(e) => definir('status', e.target.value)}>
                <option value="">Todos</option>
                {STATUS_CONTRATO.map((s) => (
                  <option key={s} value={s}>
                    {rotuloStatus(s)}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Origem do cliente">
              <Selecao value={params.get('origem') ?? ''} onChange={(e) => definir('origem', e.target.value)}>
                <option value="">Todas</option>
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {ORIGEM_LABEL[o]}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Gerente responsável">
              <Selecao
                value={params.get('gerenteId') ?? ''}
                onChange={(e) => definir('gerenteId', e.target.value)}
              >
                <option value="">Todos</option>
                {usuarios?.usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nomeCompleto}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Empreendimento">
              <Selecao
                value={params.get('empreendimentoId') ?? ''}
                onChange={(e) => definir('empreendimentoId', e.target.value)}
              >
                <option value="">Todos</option>
                {empreendimentos?.empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Parceiro imobiliário">
              <Selecao
                value={params.get('parceiroId') ?? ''}
                onChange={(e) => definir('parceiroId', e.target.value)}
              >
                <option value="">Todos</option>
                {parceiros?.parceiros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Situação do protocolo">
              <Selecao
                value={params.get('semProtocolo') ?? ''}
                onChange={(e) => definir('semProtocolo', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="1">Sem entrada registrada</option>
              </Selecao>
            </Campo>

            <div className="sm:col-span-2 lg:col-span-3">
              <Botao
                variante="secundario"
                onClick={() => {
                  setBusca('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                Limpar filtros
              </Botao>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ resultado */}
      {carregando && <Carregando />}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {dados && dados.clientes.length === 0 && (
        <Vazio
          titulo="Nenhum contrato encontrado"
          descricao="Ajuste a busca ou os filtros, ou cadastre um novo contrato."
          acao={
            <Link to="/contratos/novo" className="mt-2">
              <Botao>Cadastrar contrato</Botao>
            </Link>
          }
        />
      )}

      {dados && dados.clientes.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {dados.paginacao.total} resultado(s) · página {dados.paginacao.page} de{' '}
            {dados.paginacao.totalPaginas}
          </p>

          {/* Celular: cartões empilhados */}
          <ul className="space-y-2 lg:hidden">
            {dados.clientes.map((c) => (
              <li key={c.id}>
                <CartaoContrato contrato={c} />
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Contrato / Proposta</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Gerente</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assinaturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados.clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/contratos/${c.id}`} className="font-medium text-marca-700 hover:underline">
                        {c.nomeCompleto}
                      </Link>
                      <p className="text-xs text-slate-500">cadastrado em {data(c.criadoEm)}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {c.numeroContrato}
                      <p className="text-xs text-slate-500">{c.numeroProposta}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.origem === 'EMPREENDIMENTO' ? (
                        <>
                          {c.empreendimento?.nome}
                          <p className="text-xs text-slate-500">{c.empreendimento?.parceiro.nome}</p>
                        </>
                      ) : (
                        <span className="text-slate-500">Captação livre</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.gerenteResponsavel.nomeCompleto}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.statusAtual} />
                      {c.statusDesde && (
                        <p className="mt-1 text-xs text-slate-500">{haQuantoTempo(c.statusDesde)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProgressoAssinaturas
                        coletadas={c.assinaturas.filter((a) => a.status === 'ASSINADO').length}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dados.paginacao.totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Botao
                variante="secundario"
                disabled={pagina <= 1}
                onClick={() => definir('page', String(pagina - 1))}
              >
                Anterior
              </Botao>
              <span className="text-sm text-slate-600">
                {pagina} / {dados.paginacao.totalPaginas}
              </span>
              <Botao
                variante="secundario"
                disabled={pagina >= dados.paginacao.totalPaginas}
                onClick={() => definir('page', String(pagina + 1))}
              >
                Próxima
              </Botao>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CartaoContrato({ contrato }: { contrato: Contrato }) {
  const coletadas = contrato.assinaturas.filter((a) => a.status === 'ASSINADO').length;
  return (
    <Link
      to={`/contratos/${contrato.id}`}
      className="cartao block p-4 transition hover:border-marca-300 hover:shadow"
    >
      <p className="font-semibold text-slate-900">{contrato.nomeCompleto}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Contrato {contrato.numeroContrato} · Proposta {contrato.numeroProposta}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {contrato.origem === 'EMPREENDIMENTO'
          ? `${contrato.empreendimento?.nome} · ${contrato.empreendimento?.parceiro.nome}`
          : 'Captação livre'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={contrato.statusAtual} />
        <ProgressoAssinaturas coletadas={coletadas} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {contrato.gerenteResponsavel.nomeCompleto}
        {contrato.statusDesde ? ` · ${haQuantoTempo(contrato.statusDesde)}` : ''}
      </p>
    </Link>
  );
}
