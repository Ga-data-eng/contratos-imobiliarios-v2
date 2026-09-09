import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import {
  CARGO_LABEL,
  STATUS_LABEL,
  TIPO_ASSINATURA_LABEL,
  type Cargo,
  type StatusContrato,
  type TipoAssinatura,
} from '../../lib/constants';

export interface EventoTimeline {
  id: string;
  tipo: 'CADASTRO' | 'ENTRADA' | 'SAIDA' | 'STATUS' | 'ASSINATURA';
  titulo: string;
  descricao: string;
  dataHora: string;
  usuarioNome: string;
  usuarioCargo: string | null;
  observacoes: string | null;
  /** Presente apenas em eventos de assinatura, quando solicitado. */
  assinaturaDigital?: string | null;
}

const cargoLabel = (cargo?: string | null) =>
  cargo ? (CARGO_LABEL[cargo as Cargo] ?? cargo) : null;

const statusLabel = (status?: string | null) =>
  status ? (STATUS_LABEL[status as StatusContrato] ?? status) : '—';

/**
 * Monta a timeline cronológica completa de um contrato, unindo cadastro,
 * movimentações de protocolo, mudanças de status e assinaturas.
 */
export async function montarTimeline(clienteId: string, incluirImagens = false) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      gerenteResponsavel: true,
      empreendimento: { include: { parceiro: true } },
      movimentacoes: { include: { usuario: true }, orderBy: { dataHora: 'asc' } },
      historicoStatus: { include: { usuario: true }, orderBy: { dataHora: 'asc' } },
      assinaturas: { include: { usuario: true } },
    },
  });
  if (!cliente) throw notFound('Cliente/contrato não encontrado.');

  const eventos: EventoTimeline[] = [];

  eventos.push({
    id: `cadastro-${cliente.id}`,
    tipo: 'CADASTRO',
    titulo: 'Cadastro do contrato',
    descricao:
      `Contrato ${cliente.numeroContrato} / proposta ${cliente.numeroProposta} cadastrado. ` +
      (cliente.origem === 'EMPREENDIMENTO'
        ? `Origem: ${cliente.empreendimento?.nome ?? '—'} (parceiro: ${cliente.empreendimento?.parceiro.nome ?? '—'}).`
        : 'Origem: Captação livre.'),
    dataHora: cliente.criadoEm.toISOString(),
    usuarioNome: cliente.gerenteResponsavel.nomeCompleto,
    usuarioCargo: cargoLabel(cliente.gerenteResponsavel.cargo),
    observacoes: cliente.observacoes,
  });

  for (const mov of cliente.movimentacoes) {
    const entrada = mov.tipo === 'ENTRADA';
    eventos.push({
      id: `mov-${mov.id}`,
      tipo: entrada ? 'ENTRADA' : 'SAIDA',
      titulo: entrada ? 'Entrada do contrato na agência' : 'Saída do contrato da agência',
      descricao: entrada
        ? `Entregue por ${mov.entreguePor} (origem: ${mov.origemDestino}) e recebido por ${mov.recebidoPor ?? mov.usuario.nomeCompleto}.`
        : `Entregue por ${mov.entreguePor} para ${mov.recebidoPor ?? '—'} (destino/motivo: ${mov.origemDestino}).`,
      dataHora: mov.dataHora.toISOString(),
      usuarioNome: mov.usuario.nomeCompleto,
      usuarioCargo: cargoLabel(mov.usuario.cargo),
      observacoes: mov.observacoes,
    });
  }

  for (const st of cliente.historicoStatus) {
    eventos.push({
      id: `status-${st.id}`,
      tipo: 'STATUS',
      titulo: 'Mudança de status',
      descricao: `${statusLabel(st.statusAnterior)} → ${statusLabel(st.statusNovo)}${st.motivo ? ` (${st.motivo})` : ''}`,
      dataHora: st.dataHora.toISOString(),
      usuarioNome: st.usuario.nomeCompleto,
      usuarioCargo: cargoLabel(st.usuario.cargo),
      observacoes: st.observacoes,
    });
  }

  for (const ass of cliente.assinaturas) {
    if (ass.status !== 'ASSINADO' || !ass.dataHora) continue;
    eventos.push({
      id: `assinatura-${ass.id}`,
      tipo: 'ASSINATURA',
      titulo: `Assinatura coletada: ${TIPO_ASSINATURA_LABEL[ass.tipo as TipoAssinatura] ?? ass.tipo}`,
      descricao:
        `Responsável: ${ass.responsavelNome ?? '—'}` +
        (ass.responsavelEmail ? ` (${ass.responsavelEmail})` : '') +
        (ass.usuario ? ` · coletada por ${ass.usuario.nomeCompleto}` : ''),
      dataHora: ass.dataHora.toISOString(),
      usuarioNome: ass.usuario?.nomeCompleto ?? ass.responsavelNome ?? '—',
      usuarioCargo: cargoLabel(ass.usuario?.cargo),
      observacoes: null,
      ...(incluirImagens ? { assinaturaDigital: ass.assinaturaDigital } : {}),
    });
  }

  // Eventos causados no mesmo instante (a assinatura e a mudança de status que
  // ela dispara, por exemplo) precisam sair na ordem da causa para o efeito.
  const PRIORIDADE: Record<EventoTimeline['tipo'], number> = {
    CADASTRO: 0,
    ENTRADA: 1,
    ASSINATURA: 2,
    SAIDA: 3,
    STATUS: 4,
  };

  eventos.sort(
    (a, b) =>
      a.dataHora.localeCompare(b.dataHora) || PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo],
  );

  return { cliente, eventos };
}
