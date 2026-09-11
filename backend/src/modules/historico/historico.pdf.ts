import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { EventoTimeline } from './historico.service';
import { dataHoraBR } from '../../lib/datas';
import {
  CARGO_LABEL,
  STATUS_LABEL,
  TIPO_ASSINATURA_LABEL,
  type Cargo,
  type StatusContrato,
  type TipoAssinatura,
} from '../../lib/constants';

interface DadosPdf {
  cliente: any;
  eventos: EventoTimeline[];
  geradoPor: string;
}

const CINZA = '#4b5563';
const ESCURO = '#111827';
const AZUL = '#1d4ed8';

const ROTULO_EVENTO: Record<EventoTimeline['tipo'], string> = {
  CADASTRO: 'CADASTRO',
  ENTRADA: 'ENTRADA',
  SAIDA: 'SAÍDA',
  STATUS: 'STATUS',
  ASSINATURA: 'ASSINATURA',
};

/** Gera o PDF do histórico/auditoria de um contrato direto no response. */
export function gerarPdfHistorico(res: Response, dados: DadosPdf) {
  const { cliente, eventos, geradoPor } = dados;
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

  const nomeArquivo = `historico-contrato-${String(cliente.numeroContrato).replace(/[^\w.-]/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  doc.pipe(res);

  // ---------------------------------------------------------------- cabeçalho
  doc.fillColor(ESCURO).fontSize(16).font('Helvetica-Bold');
  doc.text('Histórico do Contrato de Crédito Imobiliário');
  doc.moveDown(0.2);
  doc.fontSize(9).font('Helvetica').fillColor(CINZA);
  doc.text('Documento de uso interno — protocolo de entrega e devolução de contratos');
  doc.moveDown(0.8);

  linha(doc);
  doc.moveDown(0.6);

  // ------------------------------------------------------------------- resumo
  const origem =
    cliente.origem === 'EMPREENDIMENTO'
      ? `${cliente.empreendimento?.nome ?? '—'} / ${cliente.empreendimento?.parceiro?.nome ?? '—'}`
      : 'Captação livre';

  campos(doc, [
    ['Cliente', cliente.nomeCompleto],
    ['Nº do contrato', cliente.numeroContrato],
    ['Nº da proposta', cliente.numeroProposta],
    [
      'Gerente responsável',
      `${cliente.gerenteResponsavel.nomeCompleto} (${CARGO_LABEL[cliente.gerenteResponsavel.cargo as Cargo] ?? cliente.gerenteResponsavel.cargo})`,
    ],
    ['Origem', origem],
    [
      'Status atual',
      cliente.statusAtual
        ? (STATUS_LABEL[cliente.statusAtual as StatusContrato] ?? cliente.statusAtual)
        : 'SEM PROTOCOLO DE ENTRADA',
    ],
    ['Status desde', dataHoraBR(cliente.statusDesde)],
  ]);

  doc.moveDown(0.6);
  linha(doc);
  doc.moveDown(0.6);

  // -------------------------------------------------------------- assinaturas
  doc.fillColor(ESCURO).font('Helvetica-Bold').fontSize(12).text('Assinaturas');
  doc.moveDown(0.4);
  doc.fontSize(9).font('Helvetica');

  for (const ass of cliente.assinaturas ?? []) {
    const rotulo = TIPO_ASSINATURA_LABEL[ass.tipo as TipoAssinatura] ?? ass.tipo;
    const assinado = ass.status === 'ASSINADO';
    doc.fillColor(ESCURO).font('Helvetica-Bold').text(rotulo, { continued: true });
    doc
      .font('Helvetica')
      .fillColor(assinado ? '#15803d' : '#b45309')
      .text(`  ${assinado ? 'ASSINADO' : 'PENDENTE'}`);
    if (assinado) {
      doc
        .fillColor(CINZA)
        .text(
          `Responsável: ${ass.responsavelNome ?? '—'}${ass.responsavelEmail ? ` (${ass.responsavelEmail})` : ''} · ${dataHoraBR(ass.dataHora)}`,
        );
    }
    doc.moveDown(0.5);
  }

  doc.moveDown(0.2);
  linha(doc);
  doc.moveDown(0.6);

  // ----------------------------------------------------------------- timeline
  doc.fillColor(ESCURO).font('Helvetica-Bold').fontSize(12).text('Linha do tempo (auditoria)');
  doc.moveDown(0.5);

  for (const evento of eventos) {
    garantirEspaco(doc, 60);
    doc.fontSize(8).fillColor(AZUL).font('Helvetica-Bold');
    doc.text(`${dataHoraBR(evento.dataHora)}  ·  ${ROTULO_EVENTO[evento.tipo]}`);
    doc.fontSize(10).fillColor(ESCURO).font('Helvetica-Bold').text(evento.titulo);
    doc.fontSize(9).fillColor(CINZA).font('Helvetica').text(evento.descricao);
    doc.text(
      `Responsável: ${evento.usuarioNome}${evento.usuarioCargo ? ` — ${evento.usuarioCargo}` : ''}`,
    );
    if (evento.observacoes) doc.text(`Observações: ${evento.observacoes}`);
    doc.moveDown(0.6);
  }

  if (eventos.length === 0) {
    doc.fontSize(9).fillColor(CINZA).text('Nenhum evento registrado.');
  }

  // ------------------------------------------------------------------ rodapés
  // O texto fica dentro da margem inferior de propósito (perto da borda da
  // página). Sem zerar `margins.bottom` antes, o PDFKit acha que o conteúdo
  // "não cabe" ali e insere uma página extra em branco só para o rodapé.
  const faixa = doc.bufferedPageRange();
  const margemInferiorOriginal = doc.page.margins.bottom;
  for (let i = 0; i < faixa.count; i += 1) {
    doc.switchToPage(faixa.start + i);
    doc.page.margins.bottom = 0;
    doc.fontSize(7).fillColor(CINZA).font('Helvetica');
    doc.text(
      `Emitido em ${dataHoraBR(new Date())} por ${geradoPor} · Página ${i + 1} de ${faixa.count} · Registros de auditoria são imutáveis.`,
      40,
      doc.page.height - 30,
      { width: doc.page.width - 80, align: 'center', lineBreak: false },
    );
    doc.page.margins.bottom = margemInferiorOriginal;
  }

  doc.end();
}

function linha(doc: PDFKit.PDFDocument) {
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .stroke();
}

function campos(doc: PDFKit.PDFDocument, pares: [string, string][]) {
  doc.fontSize(9);
  for (const [rotulo, valor] of pares) {
    doc.font('Helvetica-Bold').fillColor(CINZA).text(`${rotulo}: `, { continued: true });
    doc.font('Helvetica').fillColor(ESCURO).text(valor || '—');
  }
}

function garantirEspaco(doc: PDFKit.PDFDocument, altura: number) {
  if (doc.y + altura > doc.page.height - 60) doc.addPage();
}
