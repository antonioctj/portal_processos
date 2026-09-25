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

/** Auto-layout simples em grade horizontal, usado quando elementos não possuem posição salva. */
function autoLayout(elements: XmlElementInput[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let x = 120;
  const y = 200;
  for (const el of elements) {
    if (el.positionX != null && el.positionY != null) {
      positions.set(el.bpmnElementId, { x: el.positionX, y: el.positionY });
    } else {
      positions.set(el.bpmnElementId, { x, y });
      x += 180;
    }
  }
  return positions;
}

export function buildBpmnXml(
  processId: string,
  processName: string,
  elements: XmlElementInput[],
  connections: XmlConnectionInput[]
): string {
  const positions = autoLayout(elements);
  const processIdSafe = `Process_${processId.replace(/-/g, "").slice(0, 16)}`;

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
      const pos = positions.get(el.bpmnElementId) ?? { x: 120, y: 200 };
      const size = DEFAULT_SIZE[el.type] ?? { w: 100, h: 80 };
      const w = el.width ?? size.w;
      const h = el.height ?? size.h;
      return `<bpmndi:BPMNShape id="${el.bpmnElementId}_di" bpmnElement="${el.bpmnElementId}">
        <dc:Bounds x="${pos.x}" y="${pos.y}" width="${w}" height="${h}" />
      </bpmndi:BPMNShape>`;
    })
    .join("\n      ");

  const edgesXml = connections
    .map((c) => {
      const sourcePos = positions.get(c.sourceId) ?? { x: 0, y: 0 };
      const targetPos = positions.get(c.targetId) ?? { x: 0, y: 0 };
      return `<bpmndi:BPMNEdge id="${c.bpmnFlowId}_di" bpmnElement="${c.bpmnFlowId}">
        <di:waypoint x="${sourcePos.x + 50}" y="${sourcePos.y + 20}" />
        <di:waypoint x="${targetPos.x}" y="${targetPos.y + 20}" />
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
