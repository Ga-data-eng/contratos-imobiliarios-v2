import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Alerta, Botao, Campo, Entrada, Selecao } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { CARGOS, CARGO_LABEL, type Cargo } from '../lib/dominio';

/**
 * Login sem senha (requisito do cliente): nome, e-mail e cargo.
 * Ao sair do campo de e-mail consultamos o cadastro para pré-preencher nome e
 * cargo de quem já usa o sistema.
 */
export default function Login() {
  const { usuario, carregando, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };
  const toast = useToast();

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState<Cargo | ''>('');
  const [reconhecido, setReconhecido] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Se o e-mail é limpo/alterado, o cadastro reconhecido deixa de valer.
  useEffect(() => {
    setReconhecido(false);
  }, [email]);

  async function consultarCadastro() {
    const limpo = email.trim().toLowerCase();
    if (!limpo || !limpo.includes('@')) return;
    setConsultando(true);
    try {
      const r = await api<{
        encontrado: boolean;
        usuario: { nomeCompleto: string; cargo: Cargo } | null;
      }>(`/auth/lookup?email=${encodeURIComponent(limpo)}`, { semRedirecionar: true });
      if (r.encontrado && r.usuario) {
        setNomeCompleto(r.usuario.nomeCompleto);
        setCargo(r.usuario.cargo);
        setReconhecido(true);
      }
    } catch {
      // Falha na consulta não impede o login manual.
    } finally {
      setConsultando(false);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (!cargo) {
      setErro('Selecione seu cargo.');
      return;
    }

    setEnviando(true);
    try {
      const r = await entrar({ nomeCompleto: nomeCompleto.trim(), email: email.trim(), cargo });
      if (r.primeiroAcesso) {
        toast.sucesso(`Cadastro criado. Bem-vindo(a), ${r.usuario.nomeCompleto}!`);
      } else if (r.divergencia) {
        toast.aviso('Os dados informados divergem do cadastro; o cadastro existente prevaleceu.');
      }
      navegar(local.state?.de ?? '/', { replace: true });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (!carregando && usuario) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-marca-800">Controle de Contratos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Protocolo de entrega e devolução de contratos de crédito imobiliário
          </p>
        </div>

        <form onSubmit={enviar} className="cartao space-y-4 p-5">
          <Campo rotulo="E-mail" obrigatorio dica="É o identificador do seu acesso.">
            <Entrada
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={consultarCadastro}
              placeholder="nome.sobrenome@exemplo.com.br"
            />
          </Campo>

          {reconhecido && (
            <Alerta tipo="info">
              Cadastro encontrado. Nome e cargo foram preenchidos automaticamente.
            </Alerta>
          )}

          <Campo rotulo="Nome completo" obrigatorio>
            <Entrada
              type="text"
              autoComplete="name"
              required
              minLength={3}
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Nome e sobrenome"
            />
          </Campo>

          <Campo rotulo="Cargo" obrigatorio>
            <Selecao
              required
              value={cargo}
              onChange={(e) => setCargo(e.target.value as Cargo)}
              disabled={reconhecido}
            >
              <option value="">Selecione...</option>
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {CARGO_LABEL[c]}
                </option>
              ))}
            </Selecao>
          </Campo>

          {erro && <Alerta tipo="erro">{erro}</Alerta>}

          <Botao type="submit" larguraTotal carregando={enviando || consultando}>
            Entrar
          </Botao>

          <p className="text-center text-xs text-slate-500">
            Primeiro acesso? Preencha os três campos — seu usuário é criado automaticamente.
          </p>
        </form>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong className="font-semibold">Atenção — acesso sem senha.</strong> Este login não
          comprova a identidade de quem entra: qualquer pessoa pode digitar o e-mail de outro
          usuário. Antes de usar com dados reais de clientes, valide com segurança da informação e
          compliance (LGPD).
        </div>
      </div>
    </div>
  );
}
