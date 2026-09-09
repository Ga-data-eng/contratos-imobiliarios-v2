import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useUsuario } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Alerta, AreaTexto, Botao, Campo, Carregando, Entrada, Selecao } from '../components/ui';
import { IconeVoltar } from '../components/icones';
import { api, ApiError } from '../lib/api';
import { ORIGEM_LABEL, ORIGENS, type Origem } from '../lib/dominio';
import type { ContratoDetalhado, Empreendimento, Usuario } from '../lib/tipos';

interface Formulario {
  nomeCompleto: string;
  numeroContrato: string;
  numeroProposta: string;
  gerenteResponsavelId: string;
  origem: Origem;
  empreendimentoId: string;
  observacoes: string;
}

const VAZIO: Formulario = {
  nomeCompleto: '',
  numeroContrato: '',
  numeroProposta: '',
  gerenteResponsavelId: '',
  origem: 'EMPREENDIMENTO',
  empreendimentoId: '',
  observacoes: '',
};

export default function ContratoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();
  const usuarioLogado = useUsuario();
  const toast = useToast();

  const [form, setForm] = useState<Formulario>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { dados: usuarios } = useApi<{ usuarios: Usuario[] }>('/usuarios');
  const { dados: empreendimentos } = useApi<{ empreendimentos: Empreendimento[] }>('/empreendimentos');
  const { dados: existente, carregando } = useApi<{ cliente: ContratoDetalhado }>(
    editando ? `/clientes/${id}` : null,
  );

  // Novo cadastro: o gerente logado já vem selecionado como responsável.
  useEffect(() => {
    if (!editando) setForm((f) => ({ ...f, gerenteResponsavelId: usuarioLogado.id }));
  }, [editando, usuarioLogado.id]);

  useEffect(() => {
    if (!existente) return;
    const c = existente.cliente;
    setForm({
      nomeCompleto: c.nomeCompleto,
      numeroContrato: c.numeroContrato,
      numeroProposta: c.numeroProposta,
      gerenteResponsavelId: c.gerenteResponsavelId,
      origem: c.origem,
      empreendimentoId: c.empreendimentoId ?? '',
      observacoes: c.observacoes ?? '',
    });
  }, [existente]);

  const alterar = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const empreendimentoSelecionado = empreendimentos?.empreendimentos.find(
    (e) => e.id === form.empreendimentoId,
  );

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (form.origem === 'EMPREENDIMENTO' && !form.empreendimentoId) {
      setErro('Selecione o empreendimento ou mude a origem para "Captação livre".');
      return;
    }

    setEnviando(true);
    try {
      const corpo = {
        nomeCompleto: form.nomeCompleto.trim(),
        numeroContrato: form.numeroContrato.trim(),
        numeroProposta: form.numeroProposta.trim(),
        gerenteResponsavelId: form.gerenteResponsavelId,
        origem: form.origem,
        empreendimentoId: form.origem === 'EMPREENDIMENTO' ? form.empreendimentoId : null,
        observacoes: form.observacoes.trim(),
      };

      const resposta = await api<{ cliente: { id: string } }>(
        editando ? `/clientes/${id}` : '/clientes',
        { metodo: editando ? 'PUT' : 'POST', corpo },
      );

      toast.sucesso(editando ? 'Contrato atualizado.' : 'Contrato cadastrado.');
      navegar(`/contratos/${resposta.cliente.id}`, { replace: true });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o contrato.');
    } finally {
      setEnviando(false);
    }
  }

  if (editando && carregando) return <Carregando />;

  return (
    <div className="space-y-4">
      <Link
        to={editando ? `/contratos/${id}` : '/contratos'}
        className="inline-flex items-center gap-1 text-sm font-medium text-marca-700"
      >
        <IconeVoltar className="h-4 w-4" />
        Voltar
      </Link>

      <h1 className="text-xl font-bold text-slate-900">
        {editando ? 'Editar contrato' : 'Novo contrato'}
      </h1>

      <form onSubmit={enviar} className="cartao space-y-4 p-4 sm:p-5">
        <Campo rotulo="Nome completo do cliente" obrigatorio>
          <Entrada
            required
            minLength={3}
            value={form.nomeCompleto}
            onChange={(e) => alterar('nomeCompleto', e.target.value)}
            placeholder="Nome do cliente"
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Número do contrato" obrigatorio>
            <Entrada
              required
              value={form.numeroContrato}
              onChange={(e) => alterar('numeroContrato', e.target.value)}
              placeholder="0000.0000-00"
            />
          </Campo>
          <Campo rotulo="Número da proposta" obrigatorio>
            <Entrada
              required
              value={form.numeroProposta}
              onChange={(e) => alterar('numeroProposta', e.target.value)}
              placeholder="PROP-00000"
            />
          </Campo>
        </div>

        <Campo rotulo="Gerente responsável pela conta" obrigatorio>
          <Selecao
            required
            value={form.gerenteResponsavelId}
            onChange={(e) => alterar('gerenteResponsavelId', e.target.value)}
          >
            <option value="">Selecione...</option>
            {usuarios?.usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nomeCompleto}
              </option>
            ))}
          </Selecao>
        </Campo>

        {/* ------------------------------------------------- origem do cliente */}
        <fieldset>
          <legend className="rotulo">Origem do cliente *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ORIGENS.map((o) => (
              <label
                key={o}
                className={`toque flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                  form.origem === o
                    ? 'border-marca-500 bg-marca-50 text-marca-900'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="origem"
                  value={o}
                  checked={form.origem === o}
                  onChange={() => alterar('origem', o)}
                  className="h-4 w-4"
                />
                {ORIGEM_LABEL[o]}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Campos de empreendimento só existem na origem correspondente. */}
        {form.origem === 'EMPREENDIMENTO' && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Campo
              rotulo="Empreendimento"
              obrigatorio
              dica="O parceiro imobiliário vem vinculado ao empreendimento."
            >
              <Selecao
                value={form.empreendimentoId}
                onChange={(e) => alterar('empreendimentoId', e.target.value)}
              >
                <option value="">Selecione...</option>
                {empreendimentos?.empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            {empreendimentoSelecionado && (
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Parceiro vinculado</p>
                <p className="font-medium text-slate-800">
                  {empreendimentoSelecionado.parceiro.nome}
                </p>
                {empreendimentoSelecionado.parceiro.contato && (
                  <p className="text-xs text-slate-500">
                    {empreendimentoSelecionado.parceiro.contato}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Empreendimento não cadastrado?{' '}
              <Link to="/cadastros" className="font-medium text-marca-700 underline">
                Cadastre em Cadastros
              </Link>
              .
            </p>
          </div>
        )}

        <Campo rotulo="Observações">
          <AreaTexto
            value={form.observacoes}
            onChange={(e) => alterar('observacoes', e.target.value)}
            placeholder="Informações internas sobre este contrato (opcional)"
            maxLength={500}
          />
        </Campo>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={editando ? `/contratos/${id}` : '/contratos'} className="sm:w-auto">
            <Botao type="button" variante="secundario" larguraTotal>
              Cancelar
            </Botao>
          </Link>
          <Botao type="submit" carregando={enviando}>
            {editando ? 'Salvar alterações' : 'Cadastrar contrato'}
          </Botao>
        </div>
      </form>
    </div>
  );
}
