import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import { BPMN_TYPE_TO_KIND } from "../../lib/bpmnConstants";
import type { BpmnDraft } from "../../types/api";

export interface BpmnCanvasHandle {
  importXml: (xml: string) => Promise<void>;
  exportDraft: () => BpmnDraft;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
}

interface Props {
  onSelectionChange?: (elementId: string | null) => void;
}

export const BpmnCanvas = forwardRef<BpmnCanvasHandle, Props>(function BpmnCanvas({ onSelectionChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const modeler = new BpmnModeler({ container: containerRef.current });
    modelerRef.current = modeler;

    const eventBus = modeler.get("eventBus") as {
      on: (event: string, handler: (e: any) => void) => void;
      off: (event: string, handler: (e: any) => void) => void;
    };
    const handler = (e: any) => {
      const selected = e.newSelection?.[0];
      onSelectionChange?.(selected?.businessObject?.id ?? null);
    };
    eventBus.on("selection.changed", handler);

    return () => {
      eventBus.off("selection.changed", handler);
      modeler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    async importXml(xml: string) {
      if (!modelerRef.current) return;
      try {
        await modelerRef.current.importXML(xml);
        modelerRef.current.get("canvas").zoom("fit-viewport");
      } catch (err) {
        console.error("Falha ao importar BPMN", err);
      }
    },
    exportDraft(): BpmnDraft {
      if (!modelerRef.current) return { elements: [], connections: [] };
      const elementRegistry = modelerRef.current.get("elementRegistry");
      const all = elementRegistry.getAll();

      const elements: BpmnDraft["elements"] = [];
      const connections: BpmnDraft["connections"] = [];

      for (const el of all) {
        const bo = el.businessObject;
        if (!bo || !bo.$type) continue;
        if (bo.$type === "bpmn:SequenceFlow") {
          connections.push({
            id: bo.id,
            sourceId: bo.sourceRef?.id,
            targetId: bo.targetRef?.id,
            label: bo.name ?? null,
            condition: bo.conditionExpression?.body ?? null,
          });
          continue;
        }
        const kind = BPMN_TYPE_TO_KIND[bo.$type];
        if (!kind) continue;
        if (bo.$type === "bpmn:Process" || bo.$type === "bpmn:Definitions") continue;
        elements.push({
          id: bo.id,
          type: kind,
          name: bo.name ?? "",
        });
      }

      return { elements, connections: connections.filter((c) => c.sourceId && c.targetId) };
    },
    zoomIn() {
      const canvas = modelerRef.current?.get("canvas");
      canvas?.zoom(canvas.zoom() + 0.1);
    },
    zoomOut() {
      const canvas = modelerRef.current?.get("canvas");
      canvas?.zoom(Math.max(0.2, canvas.zoom() - 0.1));
    },
    zoomReset() {
      modelerRef.current?.get("canvas").zoom("fit-viewport");
    },
  }));

  return <div ref={containerRef} className="h-full w-full bg-slate-50 dark:bg-slate-900" />;
});
