import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CARGO_LABEL } from '../lib/dominio';
import {
  IconeAuditoria,
  IconeCadastros,
  IconeContratos,
  IconePainel,
  IconeProtocolo,
  IconeSair,
} from './icones';

interface ItemNav {
  para: string;
  rotulo: string;
  Icone: typeof IconePainel;
  /** Só aparece para estes cargos (undefined = todos). */
  cargos?: string[];
}

const NAVEGACAO: ItemNav[] = [
  { para: '/', rotulo: 'Início', Icone: IconePainel },
  { para: '/contratos', rotulo: 'Contratos', Icone: IconeContratos },
  { para: '/protocolo', rotulo: 'Protocolo', Icone: IconeProtocolo },
  { para: '/cadastros', rotulo: 'Cadastros', Icone: IconeCadastros },
  {
    para: '/auditoria',
    rotulo: 'Auditoria',
    Icone: IconeAuditoria,
    cargos: ['GERENTE_ADM', 'GERENTE_GERAL'],
  },
];

/**
 * Casca da aplicação.
 * Celular: cabeçalho compacto + navegação inferior fixa (alvos de 44px).
 * Desktop: barra lateral fixa.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [saindo, setSaindo] = useState(false);

  const itens = NAVEGACAO.filter((i) => !i.cargos || (usuario && i.cargos.includes(usuario.cargo)));

  async function encerrar() {
    setSaindo(true);
    await sair();
    setSaindo(false);
    navegar('/login', { replace: true });
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* -------------------------------------------------- barra lateral (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <p className="text-sm font-bold uppercase tracking-wide text-marca-700">
            Controle de Contratos
          </p>
          <p className="text-xs text-slate-500">Crédito imobiliário — uso interno</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {itens.map(({ para, rotulo, Icone }) => (
            <NavLink
              key={para}
              to={para}
              end={para === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-marca-50 text-marca-800' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icone className="h-5 w-5" />
              {rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-semibold text-slate-800">{usuario?.nomeCompleto}</p>
          <p className="truncate text-xs text-slate-500">
            {usuario ? CARGO_LABEL[usuario.cargo] : ''}
          </p>
          <button
            onClick={encerrar}
            disabled={saindo}
            className="toque mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <IconeSair className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* --------------------------------------------- cabeçalho (celular/tablet) */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-marca-700">Controle de Contratos</p>
              <p className="truncate text-xs text-slate-500">
                {usuario?.nomeCompleto} · {usuario ? CARGO_LABEL[usuario.cargo] : ''}
              </p>
            </div>
            <button
              onClick={encerrar}
              disabled={saindo}
              aria-label="Sair"
              className="toque flex items-center justify-center rounded-lg border border-slate-300 px-3 text-slate-600 disabled:opacity-60"
            >
              <IconeSair className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10">
          {children}
        </main>

        {/* --------------------------------------- navegação inferior (celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden">
          <div
            className="mx-auto grid max-w-lg"
            style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
          >
            {itens.map(({ para, rotulo, Icone }) => (
              <NavLink
                key={para}
                to={para}
                end={para === '/'}
                className={({ isActive }) =>
                  `toque flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                    isActive ? 'text-marca-700' : 'text-slate-500'
                  }`
                }
              >
                <Icone className="h-5 w-5" />
                {rotulo}
              </NavLink>
            ))}
          </div>
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </nav>
      </div>
    </div>
  );
}
