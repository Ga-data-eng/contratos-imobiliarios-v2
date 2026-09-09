import type { Cargo, Origem, TipoAssinatura } from './dominio';

export interface Usuario {
  id: string;
  nomeCompleto: string;
  email: string;
  cargo: Cargo;
}

export interface Parceiro {
  id: string;
  nome: string;
  contato: string | null;
  _count?: { empreendimentos: number };
}

export interface Empreendimento {
  id: string;
  nome: string;
  endereco: string | null;
  parceiroImobiliarioId: string;
  parceiro: Parceiro;
  _count?: { clientes: number };
}

export interface AssinaturaResumo {
  tipo: TipoAssinatura;
  status: 'PENDENTE' | 'ASSINADO';
  dataHora: string | null;
  responsavelNome: string | null;
}

export interface Assinatura extends AssinaturaResumo {
  id: string;
  clienteId: string;
  responsavelEmail: string | null;
  assinaturaDigital: string | null;
  usuario: { id: string; nomeCompleto: string; cargo: Cargo } | null;
}

export interface Movimentacao {
  id: string;
  clienteId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  entreguePor: string;
  recebidoPor: string | null;
  origemDestino: string;
  observacoes: string | null;
  dataHora: string;
  usuario: { id: string; nomeCompleto: string; cargo: Cargo };
  cliente?: { id: string; nomeCompleto: string; numeroContrato: string };
}

export interface Contrato {
  id: string;
  nomeCompleto: string;
  numeroContrato: string;
  numeroProposta: string;
  origem: Origem;
  statusAtual: string | null;
  statusDesde: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  gerenteResponsavelId: string;
  gerenteResponsavel: Usuario;
  empreendimentoId: string | null;
  empreendimento: Empreendimento | null;
  assinaturas: AssinaturaResumo[];
}

export interface ContratoDetalhado extends Omit<Contrato, 'assinaturas'> {
  assinaturas: Assinatura[];
  movimentacoes: Movimentacao[];
}

export interface Paginacao {
  page: number;
  pageSize: number;
  total: number;
  totalPaginas: number;
}

export interface EventoTimeline {
  id: string;
  tipo: 'CADASTRO' | 'ENTRADA' | 'SAIDA' | 'STATUS' | 'ASSINATURA';
  titulo: string;
  descricao: string;
  dataHora: string;
  usuarioNome: string;
  usuarioCargo: string | null;
  observacoes: string | null;
}

export interface Dashboard {
  parametros: { diasAlerta: number };
  resumo: {
    totalContratos: number;
    emAndamento: number;
    semProtocolo: number;
    finalizados: number;
    assinaturasCompletas: number;
    paradosAlerta: number;
  };
  porStatus: { status: string; total: number }[];
  porGerente: { gerenteId: string; nome: string; cargo: string; total: number }[];
  porOrigem: { origem: string; total: number }[];
  contratosParados: {
    id: string;
    nomeCompleto: string;
    numeroContrato: string;
    statusAtual: string | null;
    statusDesde: string | null;
    diasParado: number | null;
    gerenteResponsavel: { id: string; nomeCompleto: string; cargo: Cargo };
  }[];
}

export interface LogAuditoria {
  id: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioCargo: string;
  acao: string;
  entidadeAfetada: string;
  entidadeId: string | null;
  detalhes: string | null;
  ip: string | null;
  dataHora: string;
}
