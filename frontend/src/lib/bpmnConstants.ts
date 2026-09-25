import type { BpmnElementKind } from "../types/api";

export const EMPTY_DIAGRAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_empty" targetNamespace="https://processo.site/bpmn">
  <bpmn:process id="Process_empty" isExecutable="false">
    <bpmn:startEvent id="StartEvent_empty" name="Início" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_empty">
    <bpmndi:BPMNPlane id="Plane_empty" bpmnElement="Process_empty">
      <bpmndi:BPMNShape id="StartEvent_empty_di" bpmnElement="StartEvent_empty">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export const BPMN_TYPE_TO_KIND: Record<string, BpmnElementKind> = {
  "bpmn:StartEvent": "START_EVENT",
  "bpmn:EndEvent": "END_EVENT",
  "bpmn:IntermediateThrowEvent": "INTERMEDIATE_EVENT",
  "bpmn:IntermediateCatchEvent": "INTERMEDIATE_EVENT",
  "bpmn:Task": "TASK",
  "bpmn:UserTask": "USER_TASK",
  "bpmn:ServiceTask": "SERVICE_TASK",
  "bpmn:ManualTask": "MANUAL_TASK",
  "bpmn:SubProcess": "SUBPROCESS",
  "bpmn:ExclusiveGateway": "EXCLUSIVE_GATEWAY",
  "bpmn:ParallelGateway": "PARALLEL_GATEWAY",
  "bpmn:InclusiveGateway": "INCLUSIVE_GATEWAY",
  "bpmn:Participant": "POOL",
  "bpmn:Lane": "LANE",
  "bpmn:DataObjectReference": "DATA_OBJECT",
};

export const KIND_LABEL: Record<BpmnElementKind, string> = {
  START_EVENT: "Evento de início",
  END_EVENT: "Evento de fim",
  INTERMEDIATE_EVENT: "Evento intermediário",
  TASK: "Tarefa",
  USER_TASK: "Tarefa de usuário",
  SERVICE_TASK: "Tarefa de sistema",
  MANUAL_TASK: "Tarefa manual",
  SUBPROCESS: "Subprocesso",
  EXCLUSIVE_GATEWAY: "Gateway exclusivo",
  PARALLEL_GATEWAY: "Gateway paralelo",
  INCLUSIVE_GATEWAY: "Gateway inclusivo",
  POOL: "Pool",
  LANE: "Raia",
  DATA_OBJECT: "Objeto de dados",
};
