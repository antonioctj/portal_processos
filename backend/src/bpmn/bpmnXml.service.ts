import type { ElementType } from "@prisma/client";

export interface XmlElementInput {
  bpmnElementId: string;
  type: ElementType;
  name: string;
  positionX?: number | null;
  positionY?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface XmlConnectionInput {
  bpmnFlowId: string;
  sourceId: string; // bpmnElementId
  targetId: string; // bpmnElementId
  label?: string | null;
}

const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  START_EVENT: { w: 36, h: 36 },
  END_EVENT: { w: 36, h: 36 },
  INTERMEDIATE_EVENT: { w: 36, h: 36 },
  TASK: { w: 100, h: 80 },
  USER_TASK: { w: 100, h: 80 },
  SERVICE_TASK: { w: 100, h: 80 },
  MANUAL_TASK: { w: 100, h: 80 },
  SUBPROCESS: { w: 140, h: 100 },
  EXCLUSIVE_GATEWAY: { w: 50, h: 50 },
  PARALLEL_GATEWAY: { w: 50, h: 50 },
  INCLUSIVE_GATEWAY: { w: 50, h: 50 },
  POOL: { w: 600, h: 200 },
  LANE: { w: 600, h: 100 },
  DATA_OBJECT: { w: 36, h: 50 },
};

const BPMN_TAG: Record<string, string> = {
  START_EVENT: "startEvent",
  END_EVENT: "endEvent",
  INTERMEDIATE_EVENT: "intermediateThrowEvent",
  TASK: "task",
  USER_TASK: "userTask",
  SERVICE_TASK: "serviceTask",
  MANUAL_TASK: "manualTask",
  SUBPROCESS: "subProcess",
  EXCLUSIVE_GATEWAY: "exclusiveGateway",
  PARALLEL_GATEWAY: "parallelGateway",
  INCLUSIVE_GATEWAY: "inclusiveGateway",
  DATA_OBJECT: "dataObjectReference",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 150;
const MARGIN_X = 120;
const MARGIN_Y = 160;

/**
 * Auto-layout em camadas (estilo Sugiyama): elementos avançam em colunas conforme
 * a distância (caminho mais longo) desde os pontos de início do fluxo, e ramos
 * paralelos de um mesmo nível são empilhados verticalmente em vez de ficarem
 * todos numa única linha. Elementos com posição já salva (ex: editados manualmente
 * no modelador) mantêm a posição original.
 */
function autoLayout(
  elements: XmlElementInput[],
  connections: XmlConnectionInput[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const fixed = new Set<string>();
  for (const el of elements) {
    if (el.positionX != null && el.positionY != null) {
      positions.set(el.bpmnElementId, { x: el.positionX, y: el.positionY });
      fixed.add(el.bpmnElementId);
    }
  }

  const toLayout = elements.filter((el) => !fixed.has(el.bpmnElementId));
  if (toLayout.length === 0) return positions;

  const idsToLayout = new Set(toLayout.map((el) => el.bpmnElementId));
  const outgoingMap = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  for (const el of toLayout) {
    outgoingMap.set(el.bpmnElementId, []);
    incomingCount.set(el.bpmnElementId, 0);
  }
  for (const c of connections) {
    if (idsToLayout.has(c.sourceId) && idsToLayout.has(c.targetId)) {
      outgoingMap.get(c.sourceId)!.push(c.targetId);
      incomingCount.set(c.targetId, (incomingCount.get(c.targetId) ?? 0) + 1);
    }
  }

  // Nível = caminho mais longo desde uma raiz (elemento sem entrada), calculado
  // via ordenação topológica (Kahn): cada nó só é processado depois de todos os
  // seus predecessores, garantindo que o nível reflita o ramo mais distante que
  // converge nele.
  const level = new Map<string, number>();
  const indegree = new Map(incomingCount);
  const queue: string[] = [];
  for (const el of toLayout) {
    if ((indegree.get(el.bpmnElementId) ?? 0) === 0) {
      level.set(el.bpmnElementId, 0);
      queue.push(el.bpmnElementId);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const lu = level.get(u) ?? 0;
    for (const v of outgoingMap.get(u) ?? []) {
      const candidate = lu + 1;
      if (candidate > (level.get(v) ?? -1)) level.set(v, candidate);
      const remaining = (indegree.get(v) ?? 0) - 1;
      indegree.set(v, remaining);
      if (remaining === 0) queue.push(v);
    }
  }

  // Nós que sobraram fazem parte de um ciclo (loop de retrabalho) e nunca
  // atingem grau de entrada zero; recebem colunas próprias em sequência, após
  // o que já foi calculado, para não travar o layout nem sobrepor elementos.
  let fallbackLevel = 1 + Math.max(0, ...Array.from(level.values()));
  for (const el of toLayout) {
    if (!level.has(el.bpmnElementId)) {
      level.set(el.bpmnElementId, fallbackLevel);
      fallbackLevel += 1;
    }
  }

  const byLevel = new Map<number, XmlElementInput[]>();
  for (const el of toLayout) {
    const lvl = level.get(el.bpmnElementId) ?? 0;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(el);
  }

  for (const [lvl, elsInLevel] of byLevel) {
    const x = MARGIN_X + lvl * COLUMN_WIDTH;
    const offset = (elsInLevel.length - 1) / 2;
    elsInLevel.forEach((el, i) => {
      const y = MARGIN_Y + (i - offset) * ROW_HEIGHT;
      positions.set(el.bpmnElementId, { x, y });
    });
  }

  return positions;
}

export function buildBpmnXml(
  processId: string,
  processName: string,
  elements: XmlElementInput[],
  connections: XmlConnectionInput[]
): string {
  const positions = autoLayout(elements, connections);
  const processIdSafe = `Process_${processId.replace(/-/g, "").slice(0, 16)}`;

  const bounds = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const el of elements) {
    const pos = positions.get(el.bpmnElementId) ?? { x: MARGIN_X, y: MARGIN_Y };
    const size = DEFAULT_SIZE[el.type] ?? { w: 100, h: 80 };
    bounds.set(el.bpmnElementId, { x: pos.x, y: pos.y, w: el.width ?? size.w, h: el.height ?? size.h });
  }

  const flowElementsXml = elements
    .map((el) => {
      const tag = BPMN_TAG[el.type] ?? "task";
      const incoming = connections.filter((c) => c.targetId === el.bpmnElementId);
      const outgoing = connections.filter((c) => c.sourceId === el.bpmnElementId);
      const incomingXml = incoming.map((c) => `<bpmn:incoming>${c.bpmnFlowId}</bpmn:incoming>`).join("");
      const outgoingXml = outgoing.map((c) => `<bpmn:outgoing>${c.bpmnFlowId}</bpmn:outgoing>`).join("");
      return `<bpmn:${tag} id="${el.bpmnElementId}" name="${escapeXml(el.name)}">${incomingXml}${outgoingXml}</bpmn:${tag}>`;
    })
    .join("\n    ");

  const flowsXml = connections
    .map(
      (c) =>
        `<bpmn:sequenceFlow id="${c.bpmnFlowId}" sourceRef="${c.sourceId}" targetRef="${c.targetId}"${
          c.label ? ` name="${escapeXml(c.label)}"` : ""
        } />`
    )
    .join("\n    ");

  const shapesXml = elements
    .map((el) => {
      const b = bounds.get(el.bpmnElementId)!;
      return `<bpmndi:BPMNShape id="${el.bpmnElementId}_di" bpmnElement="${el.bpmnElementId}">
        <dc:Bounds x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" />
      </bpmndi:BPMNShape>`;
    })
    .join("\n      ");

  const edgesXml = connections
    .map((c) => {
      const source = bounds.get(c.sourceId);
      const target = bounds.get(c.targetId);
      if (!source || !target) return "";
      const sourceCenterY = source.y + source.h / 2;
      const targetCenterY = target.y + target.h / 2;
      // Sai pela direita do elemento de origem e entra pela esquerda do destino;
      // quando estão em linhas diferentes, insere um ponto intermediário em "L"
      // para a seta não cruzar por cima de outros elementos.
      const waypoints =
        sourceCenterY === targetCenterY
          ? [
              { x: source.x + source.w, y: sourceCenterY },
              { x: target.x, y: targetCenterY },
            ]
          : [
              { x: source.x + source.w, y: sourceCenterY },
              { x: source.x + source.w + (COLUMN_WIDTH - source.w) / 2, y: sourceCenterY },
              { x: source.x + source.w + (COLUMN_WIDTH - source.w) / 2, y: targetCenterY },
              { x: target.x, y: targetCenterY },
            ];
      const waypointsXml = waypoints.map((p) => `<di:waypoint x="${p.x}" y="${p.y}" />`).join("\n        ");
      return `<bpmndi:BPMNEdge id="${c.bpmnFlowId}_di" bpmnElement="${c.bpmnFlowId}">
        ${waypointsXml}
      </bpmndi:BPMNEdge>`;
    })
    .join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_${processIdSafe}"
  targetNamespace="https://processo.site/bpmn">
  <bpmn:process id="${processIdSafe}" name="${escapeXml(processName)}" isExecutable="false">
    ${flowElementsXml}
    ${flowsXml}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_${processIdSafe}">
    <bpmndi:BPMNPlane id="Plane_${processIdSafe}" bpmnElement="${processIdSafe}">
      ${shapesXml}
      ${edgesXml}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
