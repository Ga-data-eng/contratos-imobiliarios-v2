import { useState, type FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Alerta, Botao, Campo, Carregando, Cartao, Entrada, Selecao, TituloSecao, Vazio } from '../components/ui';
import { IconeMais } from '../components/icones';
import { api, ApiError } from '../lib/api';
import type { Empreendimento, Parceiro } from '../lib/tipos';

type Aba = 'empreendimentos' | 'parceiros';

/** Cadastros reutilizáveis: parceiros imobiliários e seus empreendimentos. */
export default function Cadastros() {
  const [aba, setAba] = useState<Aba>('empreendimentos');

  const parceiros = useApi<{ parceiros: Parceiro[] }>('/parceiros');
  const empreendimentos = useApi<{ empreendimentos: Empreendimento[] }>('/empreendimentos');

  function recarregarTudo() {
    parceiros.recarregar();
    empreendimentos.recarregar();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cadastros</h1>
        <p className="text-sm text-slate-600">
          Empreendimentos e parceiros imobiliários reutilizados no cadastro de contratos.
        </p>
      </div>

      <div className="flex gap-2" role="tablist">
        {(['empreendimentos', 'parceiros'] as Aba[]).map((valor) => (
          <button
            key={valor}
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setAba(valor)}
            className={`toque flex-1 rounded-lg px-4 text-sm font-semibold transition lg:flex-none ${
              aba === valor
                ? 'bg-marca-700 text-white'
                : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {valor === 'empreendimentos' ? 'Empreendimentos' : 'Parceiros'}
          </button>
        ))}
      </div>

      {aba === 'parceiros' ? (
        <AbaParceiros estado={parceiros} aoMudar={recarregarTudo} />
      ) : (
        <AbaEmpreendimentos
          estado={empreendimentos}
          parceiros={parceiros.dados?.parceiros ?? []}
          aoMudar={recarregarTudo}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- parceiros */

function AbaParceiros({
  estado,
  aoMudar,
}: {
  estado: ReturnType<typeof useApi<{ parceiros: Parceiro[] }>>;
  aoMudar: () => void;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<Parceiro | null>(null);

  function limpar() {
    setNome('');
    setContato('');
    setEditandoId(null);
    setAberto(false);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await api(editandoId ? `/parceiros/${editandoId}` : '/parceiros', {
        metodo: editandoId ? 'PUT' : 'POST',
        corpo: { nome: nome.trim(), contato: contato.trim() },
      });
      toast.sucesso(editandoId ? 'Parceiro atualizado.' : 'Parceiro cadastrado.');
      limpar();
      aoMudar();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao salvar o parceiro.');
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    setEnviando(true);
    try {
      await api(`/parceiros/${excluindo.id}`, { metodo: 'DELETE' });
      toast.sucesso('Parceiro excluído.');
      setExcluindo(null);
      aoMudar();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao excluir o parceiro.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <TituloSecao
        acao={
          !aberto && (
            <Botao onClick={() => setAberto(true)}>
              <IconeMais className="h-4 w-4" />
              Novo parceiro
            </Botao>
          )
        }
      >
        Parceiros imobiliários
      </TituloSecao>

      {aberto && (
        <form onSubmit={salvar} className="cartao space-y-3 p-4 sm:p-5">
          <Campo rotulo="Nome do parceiro/imobiliária" obrigatorio>
            <Entrada required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Contato" dica="Telefone e/ou e-mail (opcional).">
            <Entrada value={contato} onChange={(e) => setContato(e.target.value)} />
          </Campo>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="secundario" onClick={limpar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando}>
              {editandoId ? 'Salvar' : 'Cadastrar'}
            </Botao>
          </div>
        </form>
      )}

      {estado.carregando && <Carregando />}
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.dados?.parceiros.length === 0 && <Vazio titulo="Nenhum parceiro cadastrado" />}

      <ul className="space-y-2">
        {estado.dados?.parceiros.map((p) => (
          <li key={p.id} className="cartao p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{p.nome}</p>
                {p.contato && <p className="text-xs text-slate-500">{p.contato}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {p._count?.empreendimentos ?? 0} empreendimento(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setEditandoId(p.id);
                    setNome(p.nome);
                    setContato(p.contato ?? '');
                    setAberto(true);
                  }}
                >
                  Editar
                </Botao>
                <Botao variante="perigo" onClick={() => setExcluindo(p)}>
                  Excluir
                </Botao>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir parceiro"
        varianteConfirmar="perigo"
        textoConfirmar="Excluir"
        processando={enviando}
        onConfirmar={excluir}
        onCancelar={() => setExcluindo(null)}
      >
        <p>
          Excluir <strong>{excluindo?.nome}</strong>? A exclusão é bloqueada se houver
          empreendimentos vinculados.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/* ----------------------------------------------------------- empreendimentos */

function AbaEmpreendimentos({
  estado,
  parceiros,
  aoMudar,
}: {
  estado: ReturnType<typeof useApi<{ empreendimentos: Empreendimento[] }>>;
  parceiros: Parceiro[];
  aoMudar: () => void;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [parceiroId, setParceiroId] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<Empreendimento | null>(null);

  function limpar() {
    setNome('');
    setEndereco('');
    setParceiroId('');
    setEditandoId(null);
    setAberto(false);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await api(editandoId ? `/empreendimentos/${editandoId}` : '/empreendimentos', {
        metodo: editandoId ? 'PUT' : 'POST',
        corpo: {
          nome: nome.trim(),
          endereco: endereco.trim(),
          parceiroImobiliarioId: parceiroId,
        },
      });
      toast.sucesso(editandoId ? 'Empreendimento atualizado.' : 'Empreendimento cadastrado.');
      limpar();
      aoMudar();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao salvar o empreendimento.');
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    setEnviando(true);
    try {
      await api(`/empreendimentos/${excluindo.id}`, { metodo: 'DELETE' });
      toast.sucesso('Empreendimento excluído.');
      setExcluindo(null);
      aoMudar();
    } catch (e) {
      toast.erro(e instanceof ApiError ? e.message : 'Falha ao excluir o empreendimento.');
    } finally {
      setEnviando(false);
    }
  }

  const semParceiros = parceiros.length === 0;

  return (
    <div className="space-y-4">
      <TituloSecao
        acao={
          !aberto && (
            <Botao onClick={() => setAberto(true)} disabled={semParceiros}>
              <IconeMais className="h-4 w-4" />
              Novo
            </Botao>
          )
        }
      >
        Empreendimentos
      </TituloSecao>

      {semParceiros && (
        <Alerta tipo="aviso">
          Cadastre ao menos um parceiro imobiliário antes de criar um empreendimento.
        </Alerta>
      )}

      {aberto && (
        <form onSubmit={salvar} className="cartao space-y-3 p-4 sm:p-5">
          <Campo rotulo="Nome do empreendimento" obrigatorio>
            <Entrada required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Endereço" dica="Opcional.">
            <Entrada value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </Campo>
          <Campo rotulo="Parceiro imobiliário vinculado" obrigatorio>
            <Selecao required value={parceiroId} onChange={(e) => setParceiroId(e.target.value)}>
              <option value="">Selecione...</option>
              {parceiros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="secundario" onClick={limpar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={enviando}>
              {editandoId ? 'Salvar' : 'Cadastrar'}
            </Botao>
          </div>
        </form>
      )}

      {estado.carregando && <Carregando />}
      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado.dados?.empreendimentos.length === 0 && <Vazio titulo="Nenhum empreendimento cadastrado" />}

      <ul className="space-y-2">
        {estado.dados?.empreendimentos.map((e) => (
          <li key={e.id} className="cartao p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{e.nome}</p>
                {e.endereco && <p className="text-xs text-slate-500">{e.endereco}</p>}
                <p className="mt-1 text-xs text-slate-600">Parceiro: {e.parceiro.nome}</p>
                <p className="text-xs text-slate-500">{e._count?.clientes ?? 0} contrato(s)</p>
              </div>
              <div className="flex gap-2">
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setEditandoId(e.id);
                    setNome(e.nome);
                    setEndereco(e.endereco ?? '');
                    setParceiroId(e.parceiroImobiliarioId);
                    setAberto(true);
                  }}
                >
                  Editar
                </Botao>
                <Botao variante="perigo" onClick={() => setExcluindo(e)}>
                  Excluir
                </Botao>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir empreendimento"
        varianteConfirmar="perigo"
        textoConfirmar="Excluir"
        processando={enviando}
        onConfirmar={excluir}
        onCancelar={() => setExcluindo(null)}
      >
        <p>
          Excluir <strong>{excluindo?.nome}</strong>? A exclusão é bloqueada se houver contratos
          vinculados.
        </p>
      </ConfirmDialog>

      <Cartao className="bg-slate-50">
        <p className="text-xs text-slate-600">
          Ao cadastrar um contrato com origem “Empreendimento”, o parceiro imobiliário é
          preenchido automaticamente a partir do empreendimento escolhido.
        </p>
      </Cartao>
    </div>
  );
}
