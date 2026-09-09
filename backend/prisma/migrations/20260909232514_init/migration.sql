-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parceiros_imobiliarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parceiros_imobiliarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "parceiroImobiliarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empreendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "numeroProposta" TEXT NOT NULL,
    "gerenteResponsavelId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "empreendimentoId" TEXT,
    "statusAtual" TEXT,
    "statusDesde" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entreguePor" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "recebidoPor" TEXT,
    "origemDestino" TEXT NOT NULL,
    "observacoes" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "responsavelNome" TEXT,
    "responsavelEmail" TEXT,
    "usuarioId" TEXT,
    "assinaturaDigital" TEXT,
    "dataHora" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_historico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT,
    "observacoes" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "usuarioCargo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidadeAfetada" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "empreendimentos_parceiroImobiliarioId_idx" ON "empreendimentos"("parceiroImobiliarioId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numeroContrato_key" ON "clientes"("numeroContrato");

-- CreateIndex
CREATE INDEX "clientes_numeroContrato_idx" ON "clientes"("numeroContrato");

-- CreateIndex
CREATE INDEX "clientes_numeroProposta_idx" ON "clientes"("numeroProposta");

-- CreateIndex
CREATE INDEX "clientes_statusAtual_idx" ON "clientes"("statusAtual");

-- CreateIndex
CREATE INDEX "clientes_gerenteResponsavelId_idx" ON "clientes"("gerenteResponsavelId");

-- CreateIndex
CREATE INDEX "clientes_empreendimentoId_idx" ON "clientes"("empreendimentoId");

-- CreateIndex
CREATE INDEX "movimentacoes_clienteId_idx" ON "movimentacoes"("clienteId");

-- CreateIndex
CREATE INDEX "movimentacoes_dataHora_idx" ON "movimentacoes"("dataHora");

-- CreateIndex
CREATE INDEX "assinaturas_clienteId_idx" ON "assinaturas"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_clienteId_tipo_key" ON "assinaturas"("clienteId", "tipo");

-- CreateIndex
CREATE INDEX "status_historico_clienteId_idx" ON "status_historico"("clienteId");

-- CreateIndex
CREATE INDEX "status_historico_dataHora_idx" ON "status_historico"("dataHora");

-- CreateIndex
CREATE INDEX "logs_auditoria_dataHora_idx" ON "logs_auditoria"("dataHora");

-- CreateIndex
CREATE INDEX "logs_auditoria_usuarioId_idx" ON "logs_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidadeAfetada_entidadeId_idx" ON "logs_auditoria"("entidadeAfetada", "entidadeId");

-- AddForeignKey
ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_parceiroImobiliarioId_fkey" FOREIGN KEY ("parceiroImobiliarioId") REFERENCES "parceiros_imobiliarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_gerenteResponsavelId_fkey" FOREIGN KEY ("gerenteResponsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "empreendimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
