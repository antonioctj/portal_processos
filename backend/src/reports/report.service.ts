import PDFDocument from "pdfkit";
import type { Gap, Opportunity, Process, ProcessVersion } from "@prisma/client";

interface ReportInput {
  process: Process;
  gaps: Gap[];
  opportunities: Opportunity[];
  version: (ProcessVersion & { elements: { name: string; responsible: string | null; system: string | null }[] }) | null;
  aiSummary?: string | null;
}

export function buildExecutivePdf(input: ReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Relatório Executivo — ProcessAI", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor("#555").text(input.process.name);
    doc.fillColor("#000");
    doc.moveDown();

    section(doc, "1. Resumo executivo");
    doc
      .fontSize(10)
      .text(
        input.aiSummary ||
          `Processo "${input.process.name}" (status: ${input.process.status}, versão ${input.process.currentVersion}). ${
            input.process.objective ? `Objetivo: ${input.process.objective}` : "Objetivo não identificado."
          }`
      );

    section(doc, "2. Processo atual");
    field(doc, "Objetivo", input.process.objective);
    field(doc, "Escopo", input.process.scope);
    field(doc, "Área responsável", input.process.area);
    field(doc, "Departamento", input.process.department);

    section(doc, "3. Atividades e responsáveis");
    if (input.version?.elements.length) {
      input.version.elements.forEach((el) => {
        doc.fontSize(10).text(`• ${el.name} — Responsável: ${el.responsible ?? "Não identificado no documento"} — Sistema: ${el.system ?? "Não identificado no documento"}`);
      });
    } else {
      doc.fontSize(10).text("Nenhum elemento estruturado disponível.");
    }

    section(doc, `4. Gaps identificados (${input.gaps.length})`);
    if (input.gaps.length === 0) doc.fontSize(10).text("Nenhum gap registrado.");
    input.gaps.forEach((g, idx) => {
      doc
        .fontSize(10)
        .text(`${idx + 1}. [${g.severity}] ${g.description}`)
        .fontSize(9)
        .fillColor("#555")
        .text(`   Evidência: ${g.evidence ?? "Não identificado no documento"}`)
        .fillColor("#000");
    });

    section(doc, `5. Oportunidades de melhoria (${input.opportunities.length})`);
    if (input.opportunities.length === 0) doc.fontSize(10).text("Nenhuma oportunidade registrada.");
    input.opportunities.forEach((o, idx) => {
      doc
        .fontSize(10)
        .text(`${idx + 1}. [${o.solutionType}] ${o.title}`)
        .fontSize(9)
        .fillColor("#555")
        .text(`   ${o.description ?? ""}`)
        .fillColor("#000");
    });

    section(doc, "6. Plano de ação");
    doc
      .fontSize(10)
      .text(
        "Priorize os gaps com severidade CRITICAL/HIGH e as oportunidades de menor complexidade e maior benefício. Utilize o módulo Gaps e Oportunidades do ProcessAI para atribuir responsáveis e prazos."
      );

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#999").text(`Gerado por ProcessAI em ${new Date().toLocaleString("pt-BR")}`);

    doc.end();
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1);
  doc.fontSize(13).fillColor("#111").text(title);
  doc.moveDown(0.3);
  doc.fillColor("#000");
}

function field(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined) {
  doc.fontSize(10).text(`${label}: ${value || "Não identificado no documento"}`);
}
