import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useDebounce } from '../hooks/useApi';
import { StatusBadge } from '../components/StatusBadge';
import { Alerta, Carregando, Cartao, Entrada, TituloSecao, Vazio } from '../components/ui';
import { dataHora } from '../lib/formato';
import { CARGO_LABEL } from '../lib/dominio';
import type { Contrato, Movimentacao, Paginacao } from '../lib/tipos';

/**
 * Tela de protocolo: ponto de entrada rápido para quem está com o contrato na
 * mão. Busca o contrato e leva à ficha, onde entrada/saída são registradas.
 */
export default function Protocolo() {
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca);

  const { dados: resultado, carregando } = useApi<{ clientes: Contrato[]; paginacao: Paginacao }>(
    buscaDebounced.trim()
      ? `/clientes?q=${encodeURIComponent(buscaDebounced.trim())}&pageSize=10`
      : null,
  );

  const { dados: recentes, erro } = useApi<{ movimentacoes: Movimentacao[] }>(
    '/protocolo/movimentacoes?limite=15',
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Protocolo</h1>
        <p className="text-sm text-slate-600">
          Localize o contrato para registrar entrada ou saída na agência.
        </p>
      </div>

      <Entrada
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nº do contrato, proposta ou nome do cliente"
        aria-label="Buscar contrato para protocolo"
        autoFocus
      />

      {buscaDebounced.trim() && (
        <section>
          <TituloSecao>Resultados</TituloSecao>
          {carregando && <Carregando texto="Buscando..." />}
          {resultado && resultado.clientes.length === 0 && (
            <Vazio
              titulo="Nenhum contrato encontrado"
              descricao="Confira o número digitado ou cadastre o contrato antes de protocolar."
            />
          )}
          <ul className="space-y-2">
            {resultado?.clientes.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/contratos/${c.id}`}
                  className="cartao block p-4 transition hover:border-marca-300 hover:shadow"
                >
                  <p className="font-semibold text-slate-900">{c.nomeCompleto}</p>
                  <p className="text-xs text-slate-500">
                    Contrato {c.numeroContrato} · Proposta {c.numeroProposta}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={c.statusAtual} />
                  </div>
                  <p className="mt-2 text-xs font-medium text-marca-700">
                    {c.statusAtual === null || c.statusAtual === 'SAIDA_DA_AGENCIA'
                      ? 'Abrir para registrar entrada →'
                      : 'Abrir para movimentar →'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <TituloSecao>Movimentações recentes</TituloSecao>
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        {recentes && recentes.movimentacoes.length === 0 && (
          <Vazio titulo="Nenhuma movimentação registrada ainda" />
        )}
        <ul className="space-y-2">
          {recentes?.movimentacoes.map((m) => (
            <li key={m.id}>
              <Link
                to={`/contratos/${m.clienteId}`}
                className="cartao block p-4 transition hover:border-marca-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      m.tipo === 'ENTRADA' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                  <span className="text-xs text-slate-500">{dataHora(m.dataHora)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {m.cliente?.nomeCompleto ?? '—'}
                </p>
                <p className="text-xs text-slate-500">
                  Contrato {m.cliente?.numeroContrato ?? '—'} · {m.origemDestino}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {m.usuario.nomeCompleto} ({CARGO_LABEL[m.usuario.cargo]})
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Cartao className="bg-slate-50">
        <p className="text-xs text-slate-600">
          A entrada registra quem entregou o contrato, a origem e quem recebeu na agência (você),
          com data e hora automáticas. A saída registra quem recebeu e o motivo/destino. Ambas
          exigem confirmação explícita e ficam gravadas de forma imutável no histórico.
        </p>
      </Cartao>
    </div>
  );
}
