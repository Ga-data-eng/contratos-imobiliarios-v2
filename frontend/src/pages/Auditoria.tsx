import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApi, useDebounce } from '../hooks/useApi';
import { useUsuario } from '../contexts/AuthContext';
import { Alerta, Botao, Carregando, Entrada, Vazio } from '../components/ui';
import { dataHora } from '../lib/formato';
import { CARGO_LABEL, type Cargo } from '../lib/dominio';
import type { LogAuditoria, Paginacao } from '../lib/tipos';

const CARGOS_COM_ACESSO: Cargo[] = ['GERENTE_ADM', 'GERENTE_GERAL'];

export default function Auditoria() {
  const usuario = useUsuario();
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const buscaDebounced = useDebounce(busca);

  const consulta = new URLSearchParams({ page: String(pagina), pageSize: '50' });
  if (buscaDebounced.trim()) consulta.set('q', buscaDebounced.trim());

  const { dados, carregando, erro } = useApi<{ logs: LogAuditoria[]; paginacao: Paginacao }>(
    `/auditoria?${consulta.toString()}`,
  );

  if (!CARGOS_COM_ACESSO.includes(usuario.cargo)) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Log de auditoria</h1>
        <p className="text-sm text-slate-600">
          Registro append-only de todas as ações do sistema.
        </p>
      </div>

      <Alerta tipo="info">
        Este log não pode ser editado nem apagado — nem pela aplicação, nem por scripts: o cliente
        do banco bloqueia qualquer operação de alteração ou exclusão nestes registros.
      </Alerta>

      <Entrada
        type="search"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setPagina(1);
        }}
        placeholder="Buscar por usuário, e-mail, ação ou detalhe"
        aria-label="Buscar no log de auditoria"
      />

      {carregando && <Carregando />}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {dados?.logs.length === 0 && <Vazio titulo="Nenhum registro encontrado" />}

      <ul className="space-y-2">
        {dados?.logs.map((log) => (
          <li key={log.id} className="cartao p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-marca-50 px-2.5 py-1 text-xs font-semibold text-marca-800">
                {log.acao}
              </span>
              <time className="text-xs tabular-nums text-slate-500" dateTime={log.dataHora}>
                {dataHora(log.dataHora)}
              </time>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">{log.usuarioNome}</p>
            <p className="text-xs text-slate-500">
              {log.usuarioEmail} · {CARGO_LABEL[log.usuarioCargo as Cargo] ?? log.usuarioCargo}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {log.entidadeAfetada}
              {log.entidadeId ? ` · ${log.entidadeId}` : ''}
              {log.ip ? ` · IP ${log.ip}` : ''}
            </p>
            {log.detalhes && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-marca-700">
                  Ver detalhes
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                  {formatarDetalhes(log.detalhes)}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>

      {dados && dados.paginacao.totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Botao variante="secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Botao>
          <span className="text-sm text-slate-600">
            {pagina} / {dados.paginacao.totalPaginas}
          </span>
          <Botao
            variante="secundario"
            disabled={pagina >= dados.paginacao.totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </Botao>
        </div>
      )}
    </div>
  );
}

function formatarDetalhes(bruto: string): string {
  try {
    return JSON.stringify(JSON.parse(bruto), null, 2);
  } catch {
    return bruto;
  }
}
