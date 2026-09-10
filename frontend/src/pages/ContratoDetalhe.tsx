import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import {
  Alerta,
  AreaTexto,
  Botao,
  Campo,
  Carregando,
  Cartao,
  Dado,
  Entrada,
  Selecao,
  TituloSecao,
} from '../components/ui';
import { IconeCheck, IconePdf, IconeVoltar } from '../components/icones';
import { api, ApiError, baixarArquivo } from '../lib/api';
import { dataHora, haQuantoTempo } from '../lib/formato';
import {
  CARGO_LABEL,
  ORIGEM_LABEL,
  STATUS_FLUXO_CARTORIO_WCPS,
  STATUS_LIBERADOS_PARA_SAIDA,
  STATUS_MANUAIS,
  TIPOS_ASSINATURA,
  TIPO_ASSINATURA_LABEL,
  rotuloStatus,
  type StatusContrato,
} from '../lib/dominio';
import type { ContratoDetalhado } from '../lib/tipos';

export default function ContratoDetalhe() {
  const { id } = useParams();
  const toast = useToast();
  const { dados, carregando, erro, recarregar } = useApi<{ cliente: ContratoDetalhado }>(
    `/clientes/${id}`,
  );

  if (carregando) return <Carregando />;
  if (erro) return <Alerta tipo="erro">{erro}</Alerta>;
  if (!dados) return null;

  const c = dados.cliente;
  const naAgencia = c.statusAtual !== null && c.statusAtual !== 'SAIDA_DA_AGENCIA';
  const assinadas = c.assinaturas.filter((a) => a.status === 'ASSINADO').length;

  async function exportarPdf() {
    try {
      await baixarArquivo(
        `/clientes/${c.id}/historico/pdf`,
        `historico-contrato-${c.numeroContrato}.pdf`,
      );
    } catch {
      toast.erro('Não foi possível gerar o PDF do histórico.');
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/contratos" className="inline-flex items-center gap-1 text-sm font-medium text-marca-700">
        <IconeVoltar className="h-4 w-4" />
        Contratos
      </Link>

      {/* ------------------------------------------------------------ cabeçalho */}
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">{c.nomeCompleto}</h1>
        <p className="text-sm text-slate-600">
          Contrato {c.numeroContrato} · Proposta {c.numeroProposta}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.statusAtual} />
          {c.statusDesde && (
            <span className="text-xs text-slate-500">desde {haQuantoTempo(c.statusDesde)}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={`/contratos/${c.id}/assinaturas`}>
          <Botao>Assinaturas ({assinadas}/4)</Botao>
        </Link>
        <Link to={`/contratos/${c.id}/cartorio-wcps`}>
          <Botao variante="secundario">Pagamento ao Vendedor</Botao>
        </Link>
        <Link to={`/contratos/${c.id}/historico`}>
          <Botao variante="secundario">Histórico</Botao>
        </Link>
        <Botao variante="secundario" onClick={exportarPdf}>
          <IconePdf className="h-4 w-4" />
          PDF
        </Botao>
        {c.statusAtual !== 'SAIDA_DA_AGENCIA' && c.statusAtual !== 'FINALIZADO' && (
          <Link to={`/contratos/${c.id}/editar`}>
            <Botao variante="secundario">Editar</Botao>
          </Link>
        )}
      </div>

      {/* ---------------------------------------------------------------- ficha */}
      <section>
        <TituloSecao>Dados do contrato</TituloSecao>
        <Cartao>
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <Dado rotulo="Gerente responsável">
              {c.gerenteResponsavel.nomeCompleto}
              <span className="block text-xs font-normal text-slate-500">
                {CARGO_LABEL[c.gerenteResponsavel.cargo]} · {c.gerenteResponsavel.email}
              </span>
            </Dado>
            <Dado rotulo="Origem do cliente">{ORIGEM_LABEL[c.origem]}</Dado>
            {c.origem === 'EMPREENDIMENTO' && (
              <>
                <Dado rotulo="Empreendimento">
                  {c.empreendimento?.nome ?? '—'}
                  {c.empreendimento?.endereco && (
                    <span className="block text-xs font-normal text-slate-500">
                      {c.empreendimento.endereco}
                    </span>
                  )}
                </Dado>
                <Dado rotulo="Parceiro imobiliário">
                  {c.empreendimento?.parceiro.nome ?? '—'}
                  {c.empreendimento?.parceiro.contato && (
                    <span className="block text-xs font-normal text-slate-500">
                      {c.empreendimento.parceiro.contato}
                    </span>
                  )}
                </Dado>
              </>
            )}
            <Dado rotulo="Cadastrado em">{dataHora(c.criadoEm)}</Dado>
            {c.observacoes && <Dado rotulo="Observações">{c.observacoes}</Dado>}
          </dl>
        </Cartao>
      </section>

      {/* --------------------------------------------------- resumo assinaturas */}
      <section>
        <TituloSecao
          acao={
            <Link
              to={`/contratos/${c.id}/assinaturas`}
              className="text-sm font-medium text-marca-700 hover:underline"
            >
              Coletar
            </Link>
          }
        >
          Assinaturas
        </TituloSecao>
        <Cartao>
          <ul className="divide-y divide-slate-100">
            {TIPOS_ASSINATURA.map((tipo) => {
              const a = c.assinaturas.find((x) => x.tipo === tipo);
              const assinado = a?.status === 'ASSINADO';
              return (
                <li key={tipo} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {TIPO_ASSINATURA_LABEL[tipo]}
                    </p>
                    {assinado ? (
                      <p className="truncate text-xs text-slate-500">
                        {a?.responsavelNome} · {dataHora(a?.dataHora)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Pendente</p>
                    )}
                  </div>
                  {assinado ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      <IconeCheck className="h-3.5 w-3.5" />
                      Assinado
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Pendente
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Cartao>
      </section>

      {/* -------------------------------------------------------------- protocolo */}
      <section>
        <TituloSecao>Protocolo</TituloSecao>
        {naAgencia ? (
          <div className="space-y-4">
            {!STATUS_FLUXO_CARTORIO_WCPS.includes(c.statusAtual as StatusContrato) && (
              <AlterarStatus clienteId={c.id} statusAtual={c.statusAtual!} aoConcluir={recarregar} />
            )}
            <RegistrarSaida clienteId={c.id} statusAtual={c.statusAtual!} aoConcluir={recarregar} />
          </div>
        ) : (
          <RegistrarEntrada clienteId={c.id} aoConcluir={recarregar} />
        )}
      </section>

      {/* --------------------------------------------------------- movimentações */}
      <section>
        <TituloSecao>Movimentações</TituloSecao>
        {c.movimentacoes.length === 0 ? (
          <Cartao>
            <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
          </Cartao>
        ) : (
          <ul className="space-y-2">
            {c.movimentacoes.map((m) => (
              <li key={m.id} className="cartao p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      m.tipo === 'ENTRADA'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                  <span className="text-xs text-slate-500">{dataHora(m.dataHora)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  <strong className="font-medium">Entregue por:</strong> {m.entreguePor}
                </p>
                <p className="text-sm text-slate-700">
                  <strong className="font-medium">Recebido por:</strong> {m.recebidoPor ?? '—'}
                </p>
                <p className="text-sm text-slate-700">
                  <strong className="font-medium">
                    {m.tipo === 'ENTRADA' ? 'Origem:' : 'Destino/motivo:'}
                  </strong>{' '}
                  {m.origemDestino}
                </p>
                {m.observacoes && (
                  <p className="mt-1 text-xs text-slate-500">Obs.: {m.observacoes}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Registrado por {m.usuario.nomeCompleto} ({CARGO_LABEL[m.usuario.cargo]})
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ entrada */

function RegistrarEntrada({
  clienteId,
  aoConcluir,
}: {
  clienteId: string;
  aoConcluir: () => void;
}) {
  const toast = useToast();
  const [entreguePor, setEntreguePor] = useState('');
  const [origem, setOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function abrir(evento: FormEvent) {
    evento.preventDefault();
    setConfirmando(true);
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await api('/protocolo/entrada', {
        metodo: 'POST',
        corpo: { clienteId, entreguePor, origem, observacoes },
      });
      toast.sucesso('Entrada registrada. Contrato recebido na agência.');
      setEntreguePor('');
      setOrigem('');
      setObservacoes('');
      setConfirmando(false);
      aoConcluir();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao registrar a entrada.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <form onSubmit={abrir} className="cartao space-y-4 p-4 sm:p-5">
        <p className="text-sm text-slate-600">
          Este contrato ainda não está na agência. Registre a entrada física.
        </p>

        <Campo rotulo="Quem entregou o contrato" obrigatorio>
          <Entrada
            required
            minLength={3}
            value={entreguePor}
            onChange={(e) => setEntreguePor(e.target.value)}
            placeholder="Nome de quem trouxe o contrato"
          />
        </Campo>

        <Campo rotulo="Origem" obrigatorio dica="Cartório, imobiliária, correspondente bancário...">
          <Entrada
            required
            minLength={2}
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Ex.: Cartório de Registro de Imóveis"
          />
        </Campo>

        <Campo rotulo="Observações">
          <AreaTexto
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={500}
          />
        </Campo>

        <Botao type="submit" larguraTotal>
          Registrar entrada na agência
        </Botao>
      </form>

      <ConfirmDialog
        aberto={confirmando}
        titulo="Confirmar entrada do contrato"
        processando={enviando}
        textoConfirmar="Registrar entrada"
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      >
        <p>
          <strong>Entregue por:</strong> {entreguePor}
        </p>
        <p>
          <strong>Origem:</strong> {origem}
        </p>
        <p>Você será registrado como quem recebeu, com data e hora automáticas.</p>
      </ConfirmDialog>
    </>
  );
}

/* -------------------------------------------------------------- alterar status */

function AlterarStatus({
  clienteId,
  statusAtual,
  aoConcluir,
}: {
  clienteId: string;
  statusAtual: string;
  aoConcluir: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);

  const opcoes = STATUS_MANUAIS.filter((s) => s !== statusAtual);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!status) return;
    setEnviando(true);
    try {
      await api(`/protocolo/${clienteId}/status`, {
        metodo: 'PATCH',
        corpo: { status, observacoes },
      });
      toast.sucesso(`Status alterado para "${rotuloStatus(status)}".`);
      setStatus('');
      setObservacoes('');
      aoConcluir();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao alterar o status.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="cartao space-y-3 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-800">Alterar status</h3>
      <Campo
        rotulo="Novo status"
        dica='"Todas assinaturas coletadas" e "Saída da agência" são definidos pelo sistema.'
      >
        <Selecao value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Selecione...</option>
          {opcoes.map((s) => (
            <option key={s} value={s}>
              {rotuloStatus(s)}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Observações">
        <AreaTexto
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          maxLength={500}
        />
      </Campo>
      <Botao type="submit" variante="secundario" disabled={!status} carregando={enviando}>
        Alterar status
      </Botao>
    </form>
  );
}

/* -------------------------------------------------------------------- saída */

function RegistrarSaida({
  clienteId,
  statusAtual,
  aoConcluir,
}: {
  clienteId: string;
  statusAtual: string;
  aoConcluir: () => void;
}) {
  const toast = useToast();
  const [recebidoPor, setRecebidoPor] = useState('');
  const [destino, setDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Espelha a regra do backend (STATUS_LIBERADOS_PARA_SAIDA): fora desses
  // status a saída é antecipada/excepcional e exige justificativa.
  const incompleto = !STATUS_LIBERADOS_PARA_SAIDA.includes(statusAtual as StatusContrato);

  function abrir(evento: FormEvent) {
    evento.preventDefault();
    setConfirmando(true);
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await api('/protocolo/saida', {
        metodo: 'POST',
        corpo: { clienteId, recebidoPor, destino, observacoes, justificativa },
      });
      toast.sucesso('Saída registrada. Contrato finalizado.');
      setConfirmando(false);
      aoConcluir();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao registrar a saída.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <form onSubmit={abrir} className="cartao space-y-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-800">Registrar saída do contrato</h3>

        {incompleto && (
          <Alerta tipo="aviso">
            O contrato está em <strong>{rotuloStatus(statusAtual)}</strong>, uma etapa que ainda
            não libera saída normal. A saída só é aceita com uma justificativa explícita (ex.:
            devolução ao cartório para correção).
          </Alerta>
        )}

        <Campo rotulo="Quem está recebendo" obrigatorio>
          <Entrada
            required
            minLength={3}
            value={recebidoPor}
            onChange={(e) => setRecebidoPor(e.target.value)}
            placeholder="Cliente, correspondente, cartório..."
          />
        </Campo>

        <Campo rotulo="Motivo / destino" obrigatorio>
          <Entrada
            required
            minLength={2}
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ex.: Entrega ao cliente"
          />
        </Campo>

        {incompleto && (
          <Campo rotulo="Justificativa da saída antecipada" obrigatorio>
            <AreaTexto
              required
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que o contrato está saindo sem todas as assinaturas"
              maxLength={500}
            />
          </Campo>
        )}

        <Campo rotulo="Observações">
          <AreaTexto
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={500}
          />
        </Campo>

        <Botao type="submit" variante="perigo" larguraTotal>
          Registrar saída
        </Botao>
      </form>

      <ConfirmDialog
        aberto={confirmando}
        titulo="Confirmar saída do contrato"
        varianteConfirmar="perigo"
        textoConfirmar="Registrar saída"
        processando={enviando}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      >
        <p>
          <strong>Recebido por:</strong> {recebidoPor}
        </p>
        <p>
          <strong>Destino/motivo:</strong> {destino}
        </p>
        {incompleto && (
          <p className="rounded bg-amber-50 p-2 text-amber-900">
            Saída sem todas as assinaturas. Justificativa: {justificativa || '—'}
          </p>
        )}
        <p>Esta ação encerra o contrato na agência e não pode ser desfeita.</p>
      </ConfirmDialog>
    </>
  );
}
