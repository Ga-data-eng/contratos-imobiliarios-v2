/**
 * Seed de dados de exemplo (fictícios — nunca use dados reais de clientes).
 *
 * Usa PrismaClient diretamente, sem o middleware de imutabilidade de
 * src/lib/prisma.ts, para poder limpar as tabelas antes de recriar o cenário.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { assinaturaDemo } from './assinatura-demo';

const prisma = new PrismaClient();

const DIA = 86_400_000;
const HORA = 3_600_000;
const agora = Date.now();

/**
 * `dias` atrás, deslocado `horas` para a frente.
 * O deslocamento é somado (e não subtraído) de propósito: ele serve para
 * ordenar eventos dentro do mesmo dia — a mudança de status precisa cair
 * depois do protocolo de entrada, não antes.
 */
const diasAtras = (dias: number, horas = 0) => new Date(agora - dias * DIA + horas * HORA);

const USUARIOS = [
  { nomeCompleto: 'Ana Paula Ribeiro', email: 'ana.ribeiro@exemplo.com.br', cargo: 'GERENTE_GERAL' },
  {
    nomeCompleto: 'Carlos Eduardo Nunes',
    email: 'carlos.nunes@exemplo.com.br',
    cargo: 'GERENTE_ADM',
  },
  {
    nomeCompleto: 'Fernanda Lima Souza',
    email: 'fernanda.souza@exemplo.com.br',
    cargo: 'SUPERVISOR',
  },
  {
    nomeCompleto: 'Marcos Vinicius Alves',
    email: 'marcos.alves@exemplo.com.br',
    cargo: 'GERENTE_PF_PRIME',
  },
  {
    nomeCompleto: 'Juliana Castro Dias',
    email: 'juliana.dias@exemplo.com.br',
    cargo: 'GERENTE_PF_PRIME',
  },
];

const ORDEM = ['GERENTE_ADM', 'GERENTE_GERAL', 'SUPERVISOR', 'CLIENTE'] as const;

const STATUS_POR_ASSINATURA = {
  GERENTE_ADM: 'AGUARDANDO_ASSINATURA_GERENTE_ADM',
  GERENTE_GERAL: 'AGUARDANDO_ASSINATURA_GERENTE_GERAL',
  SUPERVISOR: 'AGUARDANDO_ASSINATURA_SUPERVISOR',
  CLIENTE: 'AGUARDANDO_ASSINATURA_CLIENTE',
} as const;

interface CenarioContrato {
  nomeCompleto: string;
  numeroContrato: string;
  numeroProposta: string;
  gerenteId: string;
  empreendimentoId?: string;
  /** Quantas assinaturas já foram coletadas, na ordem oficial. */
  assinadas: number;
  /** Dias atrás em que o contrato entrou na agência. */
  entradaDias: number;
  entreguePor: string;
  origem: string;
  /** Status final, se diferente do calculado pelas assinaturas. */
  statusFinal?: string;
  saida?: { recebidoPor: string; destino: string; dias: number };
  /** true = cadastrado mas ainda sem protocolo de entrada. */
  semProtocolo?: boolean;
  observacoes?: string;
}

async function limpar() {
  await prisma.logAuditoria.deleteMany();
  await prisma.statusHistorico.deleteMany();
  await prisma.assinatura.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.empreendimento.deleteMany();
  await prisma.parceiroImobiliario.deleteMany();
  await prisma.usuario.deleteMany();
}

async function main() {
  console.log('Limpando base...');
  await limpar();

  console.log('Criando usuários...');
  const porChave: Record<string, { id: string; nomeCompleto: string; email: string; cargo: string }> =
    {};
  for (const dados of USUARIOS) {
    const criado = await prisma.usuario.create({ data: dados });
    porChave[criado.cargo === 'GERENTE_PF_PRIME' ? criado.email : criado.cargo] = criado;
  }
  const gerenteGeral = porChave.GERENTE_GERAL;
  const gerenteAdm = porChave.GERENTE_ADM;
  const supervisor = porChave.SUPERVISOR;
  const marcos = porChave['marcos.alves@exemplo.com.br'];
  const juliana = porChave['juliana.dias@exemplo.com.br'];

  console.log('Criando parceiros e empreendimentos...');
  const horizonte = await prisma.parceiroImobiliario.create({
    data: { nome: 'Imobiliária Horizonte', contato: '(11) 4002-8922 · contato@horizonte.exemplo' },
  });
  const prime = await prisma.parceiroImobiliario.create({
    data: { nome: 'Prime Negócios Imobiliários', contato: '(11) 3555-1010' },
  });
  const vetor = await prisma.parceiroImobiliario.create({
    data: { nome: 'Vetor Imóveis', contato: 'comercial@vetor.exemplo' },
  });

  const acacias = await prisma.empreendimento.create({
    data: {
      nome: 'Residencial Jardim das Acácias',
      endereco: 'Rua das Acácias, 450 — Bairro Novo',
      parceiroImobiliarioId: horizonte.id,
    },
  });
  const solar = await prisma.empreendimento.create({
    data: {
      nome: 'Edifício Solar do Vale',
      endereco: 'Av. do Vale, 1200 — Centro',
      parceiroImobiliarioId: horizonte.id,
    },
  });
  const vistaVerde = await prisma.empreendimento.create({
    data: {
      nome: 'Condomínio Vista Verde',
      endereco: 'Estrada do Parque, km 8',
      parceiroImobiliarioId: prime.id,
    },
  });
  const portoBelo = await prisma.empreendimento.create({
    data: {
      nome: 'Residencial Porto Belo',
      endereco: 'Rua Porto Belo, 77',
      parceiroImobiliarioId: vetor.id,
    },
  });

  const cenarios: CenarioContrato[] = [
    {
      nomeCompleto: 'Roberto Carvalho Menezes',
      numeroContrato: '2024.0001-77',
      numeroProposta: 'PROP-88120',
      gerenteId: marcos.id,
      empreendimentoId: acacias.id,
      assinadas: 4,
      entradaDias: 12,
      entreguePor: 'Cartório de Registro de Imóveis — 2º Ofício',
      origem: 'Cartório',
      statusFinal: 'SAIDA_DA_AGENCIA',
      saida: {
        recebidoPor: 'Roberto Carvalho Menezes (cliente)',
        destino: 'Entrega ao cliente',
        dias: 2,
      },
    },
    {
      nomeCompleto: 'Patrícia Gomes Ferreira',
      numeroContrato: '2024.0002-31',
      numeroProposta: 'PROP-88134',
      gerenteId: marcos.id,
      empreendimentoId: acacias.id,
      assinadas: 4,
      entradaDias: 6,
      entreguePor: 'Imobiliária Horizonte — Sr. Elias',
      origem: 'Imobiliária',
      statusFinal: 'AGUARDANDO_ENVIO_DEVOLUCAO',
    },
    {
      nomeCompleto: 'Diego Fernandes Rocha',
      numeroContrato: '2024.0003-05',
      numeroProposta: 'PROP-88201',
      gerenteId: juliana.id,
      empreendimentoId: solar.id,
      assinadas: 3,
      entradaDias: 9,
      entreguePor: 'Correspondente bancário CredFácil',
      origem: 'Correspondente bancário',
      observacoes: 'Cliente virá à agência na próxima terça para assinar.',
    },
    {
      nomeCompleto: 'Luciana Tavares Pinto',
      numeroContrato: '2024.0004-92',
      numeroProposta: 'PROP-88233',
      gerenteId: juliana.id,
      empreendimentoId: vistaVerde.id,
      assinadas: 2,
      entradaDias: 4,
      entreguePor: 'Prime Negócios — Sra. Marta',
      origem: 'Imobiliária',
    },
    {
      nomeCompleto: 'Anderson Silva Prado',
      numeroContrato: '2024.0005-18',
      numeroProposta: 'PROP-88250',
      gerenteId: marcos.id,
      assinadas: 1,
      entradaDias: 15,
      entreguePor: 'Cartório de Registro de Imóveis — 1º Ofício',
      origem: 'Cartório',
      observacoes: 'Captação livre — cliente da carteira do gerente.',
    },
    {
      nomeCompleto: 'Camila Andrade Moreira',
      numeroContrato: '2024.0006-44',
      numeroProposta: 'PROP-88267',
      gerenteId: juliana.id,
      assinadas: 0,
      entradaDias: 8,
      entreguePor: 'Correspondente bancário CasaJá',
      origem: 'Correspondente bancário',
    },
    {
      nomeCompleto: 'Eduardo Bastos Lemos',
      numeroContrato: '2024.0007-63',
      numeroProposta: 'PROP-88290',
      gerenteId: marcos.id,
      empreendimentoId: portoBelo.id,
      assinadas: 0,
      entradaDias: 1,
      entreguePor: 'Vetor Imóveis — Sr. Paulo',
      origem: 'Imobiliária',
      statusFinal: 'RECEBIDO_NA_AGENCIA',
    },
    {
      nomeCompleto: 'Simone Ribeiro Nascimento',
      numeroContrato: '2024.0008-20',
      numeroProposta: 'PROP-88301',
      gerenteId: juliana.id,
      empreendimentoId: solar.id,
      assinadas: 0,
      entradaDias: 0,
      entreguePor: '—',
      origem: '—',
      semProtocolo: true,
      observacoes: 'Contrato ainda não chegou fisicamente na agência.',
    },
  ];

  console.log('Criando contratos, protocolos e assinaturas...');
  for (const cenario of cenarios) {
    const cliente = await prisma.cliente.create({
      data: {
        nomeCompleto: cenario.nomeCompleto,
        numeroContrato: cenario.numeroContrato,
        numeroProposta: cenario.numeroProposta,
        gerenteResponsavelId: cenario.gerenteId,
        origem: cenario.empreendimentoId ? 'EMPREENDIMENTO' : 'CAPTACAO_LIVRE',
        empreendimentoId: cenario.empreendimentoId ?? null,
        observacoes: cenario.observacoes ?? null,
        criadoEm: diasAtras(cenario.entradaDias + 1),
      },
    });

    // As 4 assinaturas nascem pendentes.
    await prisma.assinatura.createMany({
      data: ORDEM.map((tipo) => ({ clienteId: cliente.id, tipo, status: 'PENDENTE' })),
    });

    if (cenario.semProtocolo) continue;

    const gerenteDoCenario = cenario.gerenteId === marcos.id ? marcos : juliana;

    // ---- protocolo de entrada
    await prisma.movimentacao.create({
      data: {
        clienteId: cliente.id,
        tipo: 'ENTRADA',
        entreguePor: cenario.entreguePor,
        usuarioId: cenario.gerenteId,
        recebidoPor: gerenteDoCenario.nomeCompleto,
        origemDestino: cenario.origem,
        dataHora: diasAtras(cenario.entradaDias),
      },
    });
    await prisma.statusHistorico.create({
      data: {
        clienteId: cliente.id,
        statusAnterior: null,
        statusNovo: 'RECEBIDO_NA_AGENCIA',
        usuarioId: cenario.gerenteId,
        motivo: 'Protocolo de entrada',
        dataHora: diasAtras(cenario.entradaDias),
      },
    });

    let statusCorrente: string = 'RECEBIDO_NA_AGENCIA';
    let dataCorrente = diasAtras(cenario.entradaDias);

    // ---- assinaturas coletadas
    for (let i = 0; i < cenario.assinadas; i += 1) {
      const tipo = ORDEM[i];
      const responsavel =
        tipo === 'GERENTE_ADM'
          ? gerenteAdm
          : tipo === 'GERENTE_GERAL'
            ? gerenteGeral
            : tipo === 'SUPERVISOR'
              ? supervisor
              : null;

      const nomeResponsavel = responsavel?.nomeCompleto ?? cliente.nomeCompleto;
      const quandoAssinou = diasAtras(Math.max(0, cenario.entradaDias - (i + 1)), 3);

      await prisma.assinatura.update({
        where: { clienteId_tipo: { clienteId: cliente.id, tipo } },
        data: {
          status: 'ASSINADO',
          responsavelNome: nomeResponsavel,
          responsavelEmail: responsavel?.email ?? null,
          usuarioId: responsavel?.id ?? cenario.gerenteId,
          assinaturaDigital: assinaturaDemo(nomeResponsavel),
          dataHora: quandoAssinou,
        },
      });

      const statusNovo: string =
        i + 1 >= ORDEM.length
          ? 'TODAS_ASSINATURAS_COLETADAS'
          : STATUS_POR_ASSINATURA[ORDEM[i + 1]];

      await prisma.statusHistorico.create({
        data: {
          clienteId: cliente.id,
          statusAnterior: statusCorrente,
          statusNovo,
          usuarioId: responsavel?.id ?? cenario.gerenteId,
          motivo: `Assinatura registrada: ${tipo}`,
          dataHora: quandoAssinou,
        },
      });
      statusCorrente = statusNovo;
      dataCorrente = quandoAssinou;
    }

    // Contrato ainda aguardando a primeira assinatura.
    if (cenario.assinadas === 0 && cenario.statusFinal !== 'RECEBIDO_NA_AGENCIA') {
      const statusNovo = STATUS_POR_ASSINATURA[ORDEM[0]];
      const quando = diasAtras(cenario.entradaDias, 1);
      await prisma.statusHistorico.create({
        data: {
          clienteId: cliente.id,
          statusAnterior: statusCorrente,
          statusNovo,
          usuarioId: cenario.gerenteId,
          motivo: 'Encaminhado para coleta de assinaturas',
          dataHora: quando,
        },
      });
      statusCorrente = statusNovo;
      dataCorrente = quando;
    }

    // ---- status manual do cenário (envio/devolução)
    if (
      cenario.statusFinal &&
      cenario.statusFinal !== statusCorrente &&
      cenario.statusFinal !== 'SAIDA_DA_AGENCIA'
    ) {
      const quando = diasAtras(Math.max(0, cenario.entradaDias - 4), 6);
      await prisma.statusHistorico.create({
        data: {
          clienteId: cliente.id,
          statusAnterior: statusCorrente,
          statusNovo: cenario.statusFinal,
          usuarioId: gerenteAdm.id,
          motivo: 'Alteração manual de status',
          dataHora: quando,
        },
      });
      statusCorrente = cenario.statusFinal;
      dataCorrente = quando;
    }

    // ---- protocolo de saída
    if (cenario.saida) {
      const quando = diasAtras(cenario.saida.dias);
      await prisma.movimentacao.create({
        data: {
          clienteId: cliente.id,
          tipo: 'SAIDA',
          entreguePor: gerenteAdm.nomeCompleto,
          usuarioId: gerenteAdm.id,
          recebidoPor: cenario.saida.recebidoPor,
          origemDestino: cenario.saida.destino,
          dataHora: quando,
        },
      });
      await prisma.statusHistorico.create({
        data: {
          clienteId: cliente.id,
          statusAnterior: statusCorrente,
          statusNovo: 'SAIDA_DA_AGENCIA',
          usuarioId: gerenteAdm.id,
          motivo: 'Protocolo de saída',
          dataHora: quando,
        },
      });
      statusCorrente = 'SAIDA_DA_AGENCIA';
      dataCorrente = quando;
    }

    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { statusAtual: statusCorrente, statusDesde: dataCorrente },
    });
  }

  console.log('Criando registros de auditoria de exemplo...');
  await prisma.logAuditoria.createMany({
    data: USUARIOS.map((u, i) => ({
      usuarioNome: u.nomeCompleto,
      usuarioEmail: u.email,
      usuarioCargo: u.cargo,
      acao: 'LOGIN',
      entidadeAfetada: 'Usuario',
      detalhes: JSON.stringify({ origem: 'seed' }),
      ip: `10.0.0.${10 + i}`,
      dataHora: diasAtras(1, i),
    })),
  });

  const totais = {
    usuarios: await prisma.usuario.count(),
    parceiros: await prisma.parceiroImobiliario.count(),
    empreendimentos: await prisma.empreendimento.count(),
    contratos: await prisma.cliente.count(),
    movimentacoes: await prisma.movimentacao.count(),
    assinaturasColetadas: await prisma.assinatura.count({ where: { status: 'ASSINADO' } }),
  };

  console.log('\nSeed concluído:', totais);
  console.log('\nE-mails para login de teste (o login não usa senha):');
  for (const u of USUARIOS) console.log(`  ${u.email.padEnd(34)} ${u.cargo}`);
  console.log('');
}

main()
  .catch((erro) => {
    console.error('Falha no seed:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
