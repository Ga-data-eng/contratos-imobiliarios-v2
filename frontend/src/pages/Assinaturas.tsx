import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useUsuario } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { SignaturePad } from '../components/SignaturePad';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { Alerta, Botao, Campo, Carregando, Cartao, Entrada, TituloSecao } from '../components/ui';
import { IconeCheck, IconeVoltar } from '../components/icones';
import { api, ApiError } from '../lib/api';
import { dataHora } from '../lib/formato';
import {
  CARGOS_AUTORIZADOS,
  CARGO_LABEL,
  TIPOS_ASSINATURA,
  TIPO_ASSINATURA_LABEL,
  podeAssinar,
  type TipoAssinatura,
} from '../lib/dominio';
import type { Assinatura } from '../lib/tipos';

interface Resposta {
  cliente: { id: string; nomeCompleto: string; numeroContrato: string; statusAtual: string | null };
  assinaturas: Assinatura[];
}

export default function Assinaturas() {
  const { id } = useParams();
  const { dados, carregando, erro, recarregar } = useApi<Resposta>(`/clientes/${id}/assinaturas`);

  if (carregando) return <Carregando />;
  if (erro) return <Alerta tipo="erro">{erro}</Alerta>;
  if (!dados) return null;

  const { cliente, assinaturas } = dados;
  const coletadas = assinaturas.filter((a) => a.status === 'ASSINADO').length;
  const contratoNaAgencia = cliente.statusAtual !== null && cliente.statusAtual !== 'SAIDA_DA_AGENCIA';

  return (
    <div className="space-y-5">
      <Link
        to={`/contratos/${cliente.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-marca-700"
      >
        <IconeVoltar className="h-4 w-4" />
        Voltar ao contrato
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Assinaturas</h1>
        <p className="text-sm text-slate-600">
          {cliente.nomeCompleto} · Contrato {cliente.numeroContrato}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={cliente.statusAtual} />
          <span className="text-xs font-medium text-slate-600">{coletadas} de 4 coletadas</span>
        </div>
      </div>

      {!contratoNaAgencia && (
        <Alerta tipo="aviso">
          {cliente.statusAtual === 'SAIDA_DA_AGENCIA'
            ? 'O contrato já saiu da agência; não é possível coletar novas assinaturas.'
            : 'Registre a entrada do contrato na agência antes de coletar assinaturas.'}
        </Alerta>
      )}

      {coletadas === 4 && (
        <Alerta tipo="info">
          Todas as 4 assinaturas foram coletadas. O contrato pode ser liberado para
          envio/devolução.
        </Alerta>
      )}

      <TituloSecao>Campos de assinatura</TituloSecao>

      <div className="space-y-4">
        {TIPOS_ASSINATURA.map((tipo) => {
          const assinatura = assinaturas.find((a) => a.tipo === tipo);
          return (
            <CampoAssinatura
              key={tipo}
              tipo={tipo}
              clienteId={cliente.id}
              nomeCliente={cliente.nomeCompleto}
              assinatura={assinatura}
              habilitado={contratoNaAgencia}
              aoAssinar={recarregar}
            />
          );
        })}
      </div>
    </div>
  );
}

function CampoAssinatura({
  tipo,
  clienteId,
  nomeCliente,
  assinatura,
  habilitado,
  aoAssinar,
}: {
  tipo: TipoAssinatura;
  clienteId: string;
  nomeCliente: string;
  assinatura?: Assinatura;
  habilitado: boolean;
  aoAssinar: () => void;
}) {
  const usuario = useUsuario();
  const toast = useToast();

  const assinado = assinatura?.status === 'ASSINADO';
  const autorizado = podeAssinar(usuario.cargo, tipo);

  const [aberto, setAberto] = useState(false);
  // A assinatura do cliente é coletada no aparelho do gerente, então o nome do
  // responsável é o do cliente; nos demais campos, o do próprio usuário logado.
  const [responsavelNome, setResponsavelNome] = useState(
    tipo === 'CLIENTE' ? nomeCliente : usuario.nomeCompleto,
  );
  const [responsavelEmail, setResponsavelEmail] = useState(
    tipo === 'CLIENTE' ? '' : usuario.email,
  );
  const [imagem, setImagem] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const aoMudarTraco = useCallback((dataUrl: string | null) => setImagem(dataUrl), []);

  async function confirmar() {
    if (!imagem) return;
    setEnviando(true);
    try {
      await api(`/clientes/${clienteId}/assinaturas`, {
        metodo: 'POST',
        corpo: {
          tipo,
          responsavelNome: responsavelNome.trim(),
          responsavelEmail: responsavelEmail.trim(),
          assinaturaDigital: imagem,
        },
      });
      toast.sucesso(`Assinatura de ${TIPO_ASSINATURA_LABEL[tipo]} registrada.`);
      setConfirmando(false);
      setAberto(false);
      setImagem(null);
      aoAssinar();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao registrar a assinatura.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{TIPO_ASSINATURA_LABEL[tipo]}</h3>
          <p className="text-xs text-slate-500">
            Autorizado: {CARGOS_AUTORIZADOS[tipo].map((c) => CARGO_LABEL[c]).join(', ')}
          </p>
        </div>
        {assinado ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <IconeCheck className="h-3.5 w-3.5" />
            Assinado
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Pendente
          </span>
        )}
      </div>

      {assinado && assinatura && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            {assinatura.assinaturaDigital ? (
              <img
                src={assinatura.assinaturaDigital}
                alt={`Assinatura de ${assinatura.responsavelNome ?? ''}`}
                className="mx-auto max-h-24"
              />
            ) : (
              <p className="text-center text-xs text-slate-500">Imagem não disponível.</p>
            )}
          </div>
          <p className="text-sm text-slate-700">{assinatura.responsavelNome}</p>
          {assinatura.responsavelEmail && (
            <p className="text-xs text-slate-500">{assinatura.responsavelEmail}</p>
          )}
          <p className="text-xs text-slate-500">
            {dataHora(assinatura.dataHora)}
            {assinatura.usuario ? ` · coletada por ${assinatura.usuario.nomeCompleto}` : ''}
          </p>
          <p className="text-xs font-medium text-slate-400">
            Registro imutável — não pode ser alterado nem apagado.
          </p>
        </div>
      )}

      {!assinado && (
        <div className="mt-3">
          {!habilitado ? (
            <p className="text-sm text-slate-500">Indisponível no status atual do contrato.</p>
          ) : !autorizado ? (
            <p className="text-sm text-slate-500">
              Seu cargo ({CARGO_LABEL[usuario.cargo]}) não pode assinar este campo.
            </p>
          ) : !aberto ? (
            <Botao onClick={() => setAberto(true)}>Coletar assinatura</Botao>
          ) : (
            <div className="space-y-3">
              <Campo rotulo="Nome do responsável" obrigatorio>
                <Entrada
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  minLength={3}
                />
              </Campo>
              <Campo rotulo="E-mail do responsável" dica="Opcional.">
                <Entrada
                  type="email"
                  inputMode="email"
                  autoCapitalize="off"
                  value={responsavelEmail}
                  onChange={(e) => setResponsavelEmail(e.target.value)}
                />
              </Campo>

              <SignaturePad onMudar={aoMudarTraco} />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setAberto(false);
                    setImagem(null);
                  }}
                >
                  Cancelar
                </Botao>
                <Botao
                  disabled={!imagem || responsavelNome.trim().length < 3}
                  onClick={() => setConfirmando(true)}
                >
                  Confirmar assinatura
                </Botao>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        aberto={confirmando}
        titulo={`Confirmar assinatura — ${TIPO_ASSINATURA_LABEL[tipo]}`}
        textoConfirmar="Registrar assinatura"
        processando={enviando}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      >
        <p>
          <strong>Responsável:</strong> {responsavelNome}
        </p>
        {imagem && (
          <img
            src={imagem}
            alt="Prévia da assinatura"
            className="mx-auto max-h-24 rounded border border-slate-200 bg-white"
          />
        )}
        <p>
          Uma vez registrada, a assinatura passa a ser um registro imutável e não poderá ser
          alterada ou apagada.
        </p>
      </ConfirmDialog>
    </Cartao>
  );
}
