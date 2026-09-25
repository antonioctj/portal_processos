import { SourceType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { buildBpmnXml } from "./bpmnXml.service";
import type { BpmnDraft } from "../ai/types";

export async function getOrCreateCurrentVersion(processId: string, userId: string) {
  const existing = await prisma.processVersion.findFirst({
    where: { processId, isCurrent: true },
  });
  if (existing) return existing;

  const version = await prisma.processVersion.create({
    data: {
      processId,
      version: "0.1",
      type: "AS_IS",
      label: "Versão inicial",
      isCurrent: true,
      createdById: userId,
    },
  });
  return version;
}

export async function replaceVersionBpmn(
  processVersionId: string,
  draft: BpmnDraft,
  sourceType: SourceType
) {
  await prisma.$transaction(async (tx) => {
    await tx.processConnection.deleteMany({ where: { processVersionId } });
    await tx.processElement.deleteMany({ where: { processVersionId } });

    const createdByBpmnId = new Map<string, string>();
    for (const el of draft.elements) {
      const created = await tx.processElement.create({
        data: {
          processVersionId,
          bpmnElementId: el.id,
          type: el.type,
          name: el.name,
          responsible: el.responsible ?? null,
          system: el.system ?? null,
          laneId: el.laneId ?? null,
          confidence: "MEDIUM",
          sourceType,
        },
      });
      createdByBpmnId.set(el.id, created.id);
    }

    for (const conn of draft.connections) {
      const sourceId = createdByBpmnId.get(conn.sourceId);
      const targetId = createdByBpmnId.get(conn.targetId);
      if (!sourceId || !targetId) continue;
      await tx.processConnection.create({
        data: {
          processVersionId,
          bpmnFlowId: conn.id,
          sourceId,
          targetId,
          label: conn.label ?? null,
          condition: conn.condition ?? null,
          sourceType,
        },
      });
    }
  });

  return regenerateXml(processVersionId);
}

export async function regenerateXml(processVersionId: string) {
  const version = await prisma.processVersion.findUniqueOrThrow({
    where: { id: processVersionId },
    include: { process: true },
  });
  const elements = await prisma.processElement.findMany({ where: { processVersionId } });
  const connections = await prisma.processConnection.findMany({ where: { processVersionId } });

  const xml = buildBpmnXml(
    version.processId,
    version.process.name,
    elements.map((e) => ({
      bpmnElementId: e.bpmnElementId,
      type: e.type,
      name: e.name,
      positionX: e.positionX,
      positionY: e.positionY,
      width: e.width,
      height: e.height,
    })),
    connections.map((c) => {
      const source = elements.find((e) => e.id === c.sourceId);
      const target = elements.find((e) => e.id === c.targetId);
      return {
        bpmnFlowId: c.bpmnFlowId,
        sourceId: source?.bpmnElementId ?? "",
        targetId: target?.bpmnElementId ?? "",
        label: c.label,
      };
    })
  );

  const bpmnVersion = await prisma.bpmnVersion.upsert({
    where: { processVersionId },
    create: { processVersionId, xml, generatedBy: "AI_SUGGESTION" },
    update: { xml },
  });

  return bpmnVersion;
}

export async function loadBpmnDraft(processVersionId: string): Promise<BpmnDraft> {
  const elements = await prisma.processElement.findMany({ where: { processVersionId } });
  const connections = await prisma.processConnection.findMany({ where: { processVersionId } });
  const byId = new Map(elements.map((e) => [e.id, e.bpmnElementId]));

  return {
    elements: elements.map((e) => ({
      id: e.bpmnElementId,
      type: e.type,
      name: e.name,
      laneId: e.laneId,
      responsible: e.responsible,
      system: e.system,
    })),
    connections: connections.map((c) => ({
      id: c.bpmnFlowId,
      sourceId: byId.get(c.sourceId) ?? "",
      targetId: byId.get(c.targetId) ?? "",
      label: c.label,
      condition: c.condition,
    })),
  };
}
