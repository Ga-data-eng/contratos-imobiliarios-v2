import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { Alerta, AreaTexto, Botao, Campo, Carregando, Cartao, TituloSecao } from '../components/ui';
import { IconeCheck, IconeVoltar } from '../components/icones';
import { api, ApiError } from '../lib/api';
import { haQuantoTempo } from '../lib/formato';
import type { ContratoDetalhado } from '../lib/tipos';

/**
 * Etapa de pagamento ao vendedor: contrato assinado -> enviado para registro
 * no cartório -> volta registrado e é enviado ao WCPS -> WCPS libera o
 * pagamento -> processo finalizado (arquivado). Cada ação só é aceita a
 * partir do status certo — não dá para pular etapa.
 */
export default function CartorioWcps() {
  const { id } = useParams();
  const { dados, carregando, erro, recarregar } = useApi<{ cliente: ContratoDetalhado }>(
    `/clientes/${id}`,
  );

  if (carregando) return <Carregando />;
  if (erro) return <Alerta tipo="erro">{erro}</Alerta>;
  if (!dados) return null;

  const c = dados.cliente;
  const status = c.statusAtual;

  return (
    <div className="space-y-5">
      <Link
        to={`/contratos/${c.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-marca-700"
      >
        <IconeVoltar className="h-4 w-4" />
        Voltar ao contrato
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Pagamento ao Vendedor</h1>
        <p className="text-sm text-slate-600">
          {c.nomeCompleto} · Contrato {c.numeroContrato}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {c.statusDesde && (
            <span className="text-xs text-slate-500">desde {haQuantoTempo(c.statusDesde)}</span>
          )}
        </div>
      </div>

      <Linha
        numero={1}
        titulo="Registro no cartório"
        concluido={
          status === 'AGUARDANDO_PAGAMENTO_WCPS' ||
          status === 'FINALIZADO' ||
          status === 'AGUARDANDO_ENVIO_DEVOLUCAO' ||
          status === 'SAIDA_DA_AGENCIA'
        }
        atual={status === 'AGUARDANDO_REGISTRO_CARTORIO'}
      >
        {status === 'TODAS_ASSINATURAS_COLETADAS' && (
          <AcaoEtapa
            texto="Todas as assinaturas foram coletadas. Envie o contrato para registro no cartório."
            rotuloBotao="Enviar para o cartório"
            rotuloConfirmar="Confirmar envio ao cartório"
            endpoint={`/protocolo/${c.id}/enviar-cartorio`}
            mensagemSucesso="Contrato enviado para registro no cartório."
            aoConcluir={recarregar}
          />
        )}
        {status === 'AGUARDANDO_REGISTRO_CARTORIO' && (
          <Alerta tipo="info">Aguardando o contrato voltar registrado do cartório.</Alerta>
        )}
        {!['TODAS_ASSINATURAS_COLETADAS', 'AGUARDANDO_REGISTRO_CARTORIO'].includes(
          status ?? '',
        ) &&
          status !== null && <p className="text-sm text-emerald-700">Etapa concluída.</p>}
      </Linha>

      <Linha
        numero={2}
        titulo="Envio ao WCPS"
        concluido={status === 'FINALIZADO' || status === 'AGUARDANDO_ENVIO_DEVOLUCAO' || status === 'SAIDA_DA_AGENCIA'}
        atual={status === 'AGUARDANDO_PAGAMENTO_WCPS'}
      >
        {status === 'AGUARDANDO_REGISTRO_CARTORIO' && (
          <AcaoEtapa
            texto="Confirme que o contrato voltou registrado do cartório para enviá-lo ao WCPS, para análise e liberação do pagamento."
            rotuloBotao="Confirmar retorno e enviar ao WCPS"
            rotuloConfirmar="Confirmar retorno do cartório"
            endpoint={`/protocolo/${c.id}/confirmar-retorno-cartorio`}
            mensagemSucesso="Retorno do cartório confirmado. Contrato enviado ao WCPS."
            dicaObservacoes="Ex.: número de registro/matrícula do cartório."
            aoConcluir={recarregar}
          />
        )}
        {status === 'AGUARDANDO_PAGAMENTO_WCPS' && (
          <Alerta tipo="info">Aguardando análise e liberação do pagamento pelo WCPS.</Alerta>
        )}
        {(status === 'FINALIZADO' ||
          status === 'AGUARDANDO_ENVIO_DEVOLUCAO' ||
          status === 'SAIDA_DA_AGENCIA') && <p className="text-sm text-emerald-700">Etapa concluída.</p>}
      </Linha>

      <Linha numero={3} titulo="Pagamento e arquivamento" concluido={status === 'FINALIZADO'} atual={false}>
        {status === 'AGUARDANDO_PAGAMENTO_WCPS' && (
          <AcaoEtapa
            texto="Confirme que o WCPS liberou o pagamento ao vendedor. Isso finaliza o processo e arquiva o contrato."
            rotuloBotao="Confirmar pagamento WCPS"
            rotuloConfirmar="Confirmar pagamento e finalizar"
            endpoint={`/protocolo/${c.id}/confirmar-pagamento-wcps`}
            mensagemSucesso="Pagamento confirmado. Processo finalizado."
            dicaObservacoes="Ex.: valor liberado, data da liberação."
            aoConcluir={recarregar}
          />
        )}
        {status === 'FINALIZADO' && (
          <Alerta tipo="info">
            Processo finalizado. O contrato está arquivado fisicamente na agência.
          </Alerta>
        )}
      </Linha>

      {status !== null &&
        !['TODAS_ASSINATURAS_COLETADAS', 'AGUARDANDO_REGISTRO_CARTORIO', 'AGUARDANDO_PAGAMENTO_WCPS', 'FINALIZADO'].includes(
          status,
        ) && (
          <Alerta tipo="aviso">
            Esta etapa começa depois que as 4 assinaturas forem coletadas. Status atual:{' '}
            <strong>{c.statusAtual}</strong>.
          </Alerta>
        )}
    </div>
  );
}

function Linha({
  numero,
  titulo,
  concluido,
  atual,
  children,
}: {
  numero: number;
  titulo: string;
  concluido: boolean;
  atual: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <TituloSecao>
        <span className="inline-flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              concluido
                ? 'bg-emerald-600 text-white'
                : atual
                  ? 'bg-marca-600 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {concluido ? <IconeCheck className="h-3.5 w-3.5" /> : numero}
          </span>
          {titulo}
        </span>
      </TituloSecao>
      <Cartao>{children}</Cartao>
    </section>
  );
}

function AcaoEtapa({
  texto,
  rotuloBotao,
  rotuloConfirmar,
  endpoint,
  mensagemSucesso,
  dicaObservacoes,
  aoConcluir,
}: {
  texto: string;
  rotuloBotao: string;
  rotuloConfirmar: string;
  endpoint: string;
  mensagemSucesso: string;
  dicaObservacoes?: string;
  aoConcluir: () => void;
}) {
  const toast = useToast();
  const [observacoes, setObservacoes] = useState('');
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function abrir(evento: FormEvent) {
    evento.preventDefault();
    setConfirmando(true);
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await api(endpoint, { metodo: 'POST', corpo: { observacoes } });
      toast.sucesso(mensagemSucesso);
      setConfirmando(false);
      setAberto(false);
      setObservacoes('');
      aoConcluir();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao registrar a ação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="text-sm text-slate-700">{texto}</p>
      {!aberto ? (
        <Botao className="mt-3" onClick={() => setAberto(true)}>
          {rotuloBotao}
        </Botao>
      ) : (
        <form onSubmit={abrir} className="mt-3 space-y-3">
          <Campo rotulo="Observações" dica={dicaObservacoes ?? 'Opcional.'}>
            <AreaTexto
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={500}
            />
          </Campo>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit">{rotuloBotao}</Botao>
          </div>
        </form>
      )}

      <ConfirmDialog
        aberto={confirmando}
        titulo={rotuloConfirmar}
        textoConfirmar="Confirmar"
        processando={enviando}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      >
        <p>{texto}</p>
        {observacoes && (
          <p className="rounded bg-slate-50 p-2 text-slate-700">Observações: {observacoes}</p>
        )}
        <p>Essa ação fica registrada de forma imutável no histórico do contrato.</p>
      </ConfirmDialog>
    </>
  );
}
