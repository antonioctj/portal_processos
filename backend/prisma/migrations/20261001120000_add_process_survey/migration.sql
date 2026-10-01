-- AlterTable
ALTER TABLE "processes" ADD COLUMN "projectName" TEXT,
ADD COLUMN "documentResponsible" TEXT,
ADD COLUMN "elaborationDate" TIMESTAMP(3),
ADD COLUMN "validatorName" TEXT;

-- CreateTable
CREATE TABLE "process_surveys" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "context" TEXT,
    "scopeStart" TEXT,
    "scopeEnd" TEXT,
    "scopeIn" TEXT,
    "scopeOut" TEXT,
    "volumetria" TEXT,
    "tma" TEXT,
    "sla" TEXT,
    "frequencia" TEXT,
    "diasExecucao" TEXT,
    "horarioOperacao" TEXT,
    "capacidade" TEXT,
    "formaFaturamento" TEXT,
    "outrosIndicadores" TEXT,
    "actors" JSONB,
    "systems" JSONB,
    "inputs" JSONB,
    "flowEvidence" TEXT,
    "stepsDetail" TEXT,
    "executionContingency" TEXT,
    "filesAndData" TEXT,
    "accessProfiles" TEXT,
    "additionalInfo" TEXT,
    "pendingInfo" JSONB,
    "completenessChecklist" JSONB,
    "validationChecklist" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_surveys_processId_key" ON "process_surveys"("processId");

-- AddForeignKey
ALTER TABLE "process_surveys" ADD CONSTRAINT "process_surveys_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
