-- CreateEnum
CREATE TYPE "MemoryTemplateType" AS ENUM ('DOCUMENT_TEMPLATE', 'BPMN_PATTERN', 'EXAMPLE_PROCESS');

-- AlterTable
ALTER TABLE "processes" ADD COLUMN "macroFlow" JSONB,
ADD COLUMN "architecture" JSONB;

-- CreateTable
CREATE TABLE "process_rules" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_screens" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "stepName" TEXT,
    "description" TEXT,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "MemoryTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_rules_processId_idx" ON "process_rules"("processId");

-- CreateIndex
CREATE INDEX "process_screens_processId_idx" ON "process_screens"("processId");

-- CreateIndex
CREATE INDEX "memory_templates_organizationId_idx" ON "memory_templates"("organizationId");

-- AddForeignKey
ALTER TABLE "process_rules" ADD CONSTRAINT "process_rules_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_rules" ADD CONSTRAINT "process_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_screens" ADD CONSTRAINT "process_screens_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_screens" ADD CONSTRAINT "process_screens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_templates" ADD CONSTRAINT "memory_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_templates" ADD CONSTRAINT "memory_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
