-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusCarga" AS ENUM ('REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'BLOQUEADA', 'EM_MOVIMENTACAO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusValidacaoDocumento" AS ENUM ('PENDENTE', 'VALIDO', 'INVALIDO');

-- CreateEnum
CREATE TYPE "ResultadoInspecao" AS ENUM ('PENDENTE', 'APROVADA', 'REPROVADA');

-- CreateTable
CREATE TABLE "produtos_quimicos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "numero_onu" TEXT NOT NULL,
    "classe_risco" TEXT NOT NULL,
    "grupo_compatibilidade" TEXT NOT NULL,
    "status" "StatusProduto" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_quimicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargas_quimicas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "produto_id" UUID NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "unidade_medida" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "responsavel_nome" TEXT NOT NULL,
    "responsavel_registro" TEXT NOT NULL,
    "classificacao_risco" TEXT NOT NULL,
    "status" "StatusCarga" NOT NULL,
    "inspecao_necessaria" BOOLEAN NOT NULL DEFAULT false,
    "data_entrada" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargas_quimicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_carga" (
    "id" UUID NOT NULL,
    "carga_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT,
    "obrigatorio" BOOLEAN NOT NULL,
    "status_validacao" "StatusValidacaoDocumento" NOT NULL,
    "validade" DATE,
    "observacao" TEXT,
    "validado_por" TEXT,
    "validado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecoes" (
    "id" UUID NOT NULL,
    "carga_id" UUID NOT NULL,
    "resultado" "ResultadoInspecao" NOT NULL,
    "observacao" TEXT,
    "solicitada_em" TIMESTAMP(3) NOT NULL,
    "concluida_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_cargas" (
    "id" UUID NOT NULL,
    "carga_id" UUID NOT NULL,
    "acao" TEXT NOT NULL,
    "status_anterior" "StatusCarga",
    "status_novo" "StatusCarga",
    "solicitante" TEXT NOT NULL,
    "motivo" TEXT,
    "evidencia" TEXT,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historico_cargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargas_quimicas_codigo_key" ON "cargas_quimicas"("codigo");

-- CreateIndex
CREATE INDEX "cargas_quimicas_produto_id_idx" ON "cargas_quimicas"("produto_id");

-- CreateIndex
CREATE INDEX "cargas_quimicas_status_idx" ON "cargas_quimicas"("status");

-- CreateIndex
CREATE INDEX "documentos_carga_carga_id_idx" ON "documentos_carga"("carga_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspecoes_carga_id_key" ON "inspecoes"("carga_id");

-- CreateIndex
CREATE INDEX "historico_cargas_carga_id_ocorrido_em_idx" ON "historico_cargas"("carga_id", "ocorrido_em");

-- AddForeignKey
ALTER TABLE "cargas_quimicas" ADD CONSTRAINT "cargas_quimicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos_quimicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_carga" ADD CONSTRAINT "documentos_carga_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas_quimicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecoes" ADD CONSTRAINT "inspecoes_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas_quimicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_cargas" ADD CONSTRAINT "historico_cargas_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas_quimicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cargas_quimicas" ADD CONSTRAINT "cargas_quantidade_positiva" CHECK ("quantidade" > 0);
