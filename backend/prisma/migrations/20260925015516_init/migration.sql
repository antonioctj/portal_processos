-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('DRAFT', 'IN_ANALYSIS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessVersionType" AS ENUM ('AS_IS', 'TO_BE');

-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('START_EVENT', 'END_EVENT', 'INTERMEDIATE_EVENT', 'TASK', 'USER_TASK', 'SERVICE_TASK', 'MANUAL_TASK', 'SUBPROCESS', 'EXCLUSIVE_GATEWAY', 'PARALLEL_GATEWAY', 'INCLUSIVE_GATEWAY', 'POOL', 'LANE', 'DATA_OBJECT');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('DOCUMENT', 'CHAT', 'AI_SUGGESTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'DOCX', 'XLSX', 'CSV', 'TXT', 'IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStep" AS ENUM ('EXTRACTING_CONTENT', 'IDENTIFYING_CONTEXT', 'IDENTIFYING_PROCESS', 'IDENTIFYING_ACTIVITIES', 'IDENTIFYING_RESPONSIBLES', 'IDENTIFYING_INPUTS', 'IDENTIFYING_OUTPUTS', 'IDENTIFYING_DECISIONS', 'IDENTIFYING_RULES', 'IDENTIFYING_EXCEPTIONS', 'IDENTIFYING_SYSTEMS', 'IDENTIFYING_GAPS', 'IDENTIFYING_OPPORTUNITIES');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GapCategory" AS ENUM ('MISSING_RESPONSIBLE', 'MISSING_INPUT', 'MISSING_OUTPUT', 'MISSING_RULE', 'DUPLICATED_ACTIVITY', 'REDUNDANT_ACTIVITY', 'INCONSISTENT_INFO', 'MISSING_SYSTEM', 'MANUAL_STEP', 'MISSING_SLA', 'MISSING_ENTRY_CRITERIA', 'MISSING_EXIT_CRITERIA', 'MISSING_DOCUMENTATION', 'MISSING_EXCEPTION_HANDLING', 'MISSING_CONTROL', 'REWORK', 'WAIT_POINT', 'EXCESSIVE_APPROVAL', 'UNNECESSARY_HANDOFF', 'MANUAL_CONTROL', 'OPERATIONAL_RISK', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('AUTOMATION', 'RPA', 'SYSTEM_INTEGRATION', 'STEP_ELIMINATION', 'REWORK_REDUCTION', 'APPROVAL_REDUCTION', 'PARALLELIZATION', 'DIGITALIZATION', 'TIME_REDUCTION', 'HANDOFF_REDUCTION', 'CONTROL_IMPROVEMENT', 'CX_IMPROVEMENT', 'OPERATIONAL_IMPROVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Complexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('IDENTIFIED', 'UNDER_EVALUATION', 'APPROVED', 'IN_PROGRESS', 'IMPLEMENTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI', 'LOCAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ANALYZE', 'GENERATE_BPMN', 'REFINE_BPMN', 'LOGIN', 'EXPORT', 'TEST_CONNECTION', 'OTHER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "parentId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "ownerId" TEXT,
    "department" TEXT,
    "objective" TEXT,
    "scope" TEXT,
    "category" TEXT,
    "status" "ProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" TEXT NOT NULL DEFAULT '0.1',
    "healthScore" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_versions" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" "ProcessVersionType" NOT NULL DEFAULT 'AS_IS',
    "label" TEXT,
    "changelog" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_elements" (
    "id" TEXT NOT NULL,
    "processVersionId" TEXT NOT NULL,
    "bpmnElementId" TEXT NOT NULL,
    "type" "ElementType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT,
    "area" TEXT,
    "system" TEXT,
    "input" TEXT,
    "output" TEXT,
    "sla" TEXT,
    "rule" TEXT,
    "isAutomatic" BOOLEAN,
    "estimatedTime" TEXT,
    "frequency" TEXT,
    "notes" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "laneId" TEXT,
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_connections" (
    "id" TEXT NOT NULL,
    "processVersionId" TEXT NOT NULL,
    "bpmnFlowId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT,
    "condition" TEXT,
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpmn_versions" (
    "id" TEXT NOT NULL,
    "processVersionId" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "svg" TEXT,
    "healthScore" INTEGER,
    "healthBreakdown" JSONB,
    "generatedBy" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bpmn_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_process_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_process_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "page" INTEGER,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep" "AnalysisStep",
    "stepsLog" JSONB,
    "structured" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gaps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "elementId" TEXT,
    "category" "GapCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "impact" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "recommendation" TEXT,
    "status" "GapStatus" NOT NULL DEFAULT 'OPEN',
    "responsibleId" TEXT,
    "dueDate" TIMESTAMP(3),
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceType" "SourceType" NOT NULL DEFAULT 'AI_SUGGESTION',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "elementId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currentProblem" TEXT,
    "benefit" TEXT,
    "complexity" "Complexity" NOT NULL DEFAULT 'MEDIUM',
    "dependencies" TEXT,
    "systemsInvolved" TEXT,
    "solutionType" "OpportunityType" NOT NULL,
    "evidence" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceType" "SourceType" NOT NULL DEFAULT 'AI_SUGGESTION',
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "gapId" TEXT,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibleId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AIProviderType" NOT NULL,
    "label" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiKeyLast4" TEXT,
    "endpoint" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "analysisModel" TEXT,
    "generationModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "label" TEXT,
    "purpose" TEXT,
    "inputPrice" DOUBLE PRECISION,
    "outputPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT,
    "userId" TEXT,
    "processId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "actions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "processId" TEXT,
    "version" TEXT,
    "changes" JSONB,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "tokensUsed" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "documentId" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "processes_organizationId_idx" ON "processes"("organizationId");

-- CreateIndex
CREATE INDEX "processes_projectId_idx" ON "processes"("projectId");

-- CreateIndex
CREATE INDEX "process_versions_processId_idx" ON "process_versions"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "process_versions_processId_version_key" ON "process_versions"("processId", "version");

-- CreateIndex
CREATE INDEX "process_elements_processVersionId_idx" ON "process_elements"("processVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "process_elements_processVersionId_bpmnElementId_key" ON "process_elements"("processVersionId", "bpmnElementId");

-- CreateIndex
CREATE INDEX "process_connections_processVersionId_idx" ON "process_connections"("processVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "process_connections_processVersionId_bpmnFlowId_key" ON "process_connections"("processVersionId", "bpmnFlowId");

-- CreateIndex
CREATE UNIQUE INDEX "bpmn_versions_processVersionId_key" ON "bpmn_versions"("processVersionId");

-- CreateIndex
CREATE INDEX "documents_organizationId_idx" ON "documents"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "document_process_links_documentId_processId_key" ON "document_process_links"("documentId", "processId");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE INDEX "analysis_results_processId_idx" ON "analysis_results"("processId");

-- CreateIndex
CREATE INDEX "gaps_processId_idx" ON "gaps"("processId");

-- CreateIndex
CREATE INDEX "gaps_organizationId_idx" ON "gaps"("organizationId");

-- CreateIndex
CREATE INDEX "opportunities_processId_idx" ON "opportunities"("processId");

-- CreateIndex
CREATE INDEX "opportunities_organizationId_idx" ON "opportunities"("organizationId");

-- CreateIndex
CREATE INDEX "actions_processId_idx" ON "actions"("processId");

-- CreateIndex
CREATE INDEX "ai_providers_organizationId_idx" ON "ai_providers"("organizationId");

-- CreateIndex
CREATE INDEX "ai_models_providerId_idx" ON "ai_models"("providerId");

-- CreateIndex
CREATE INDEX "ai_usage_organizationId_idx" ON "ai_usage"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_processId_idx" ON "ai_usage"("processId");

-- CreateIndex
CREATE INDEX "conversations_processId_idx" ON "conversations"("processId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_processId_idx" ON "audit_logs"("processId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_elements" ADD CONSTRAINT "process_elements_processVersionId_fkey" FOREIGN KEY ("processVersionId") REFERENCES "process_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_connections" ADD CONSTRAINT "process_connections_processVersionId_fkey" FOREIGN KEY ("processVersionId") REFERENCES "process_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_connections" ADD CONSTRAINT "process_connections_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "process_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_connections" ADD CONSTRAINT "process_connections_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "process_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpmn_versions" ADD CONSTRAINT "bpmn_versions_processVersionId_fkey" FOREIGN KEY ("processVersionId") REFERENCES "process_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_process_links" ADD CONSTRAINT "document_process_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_process_links" ADD CONSTRAINT "document_process_links_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "process_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "process_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "gaps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
