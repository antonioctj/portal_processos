import mammoth from "mammoth";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { logger } from "../config/logger";

export interface ParsedPage {
  page: number | null;
  content: string;
}

export interface ParsedDocument {
  fullText: string;
  pages: ParsedPage[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const result = await pdfParse(buffer);
  // pdf-parse não separa por página de forma nativa de fácil acesso; usamos \f (form feed)
  // quando presente, senão tratamos como documento de página única.
  const rawPages = result.text.split("\f").filter((p) => p.trim().length > 0);
  const pages =
    rawPages.length > 1
      ? rawPages.map((content, idx) => ({ page: idx + 1, content: content.trim() }))
      : [{ page: 1, content: result.text.trim() }];
  return { fullText: result.text, pages };
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return { fullText: result.value, pages: [{ page: null, content: result.value }] };
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const pages: ParsedPage[] = [];
  workbook.eachSheet((sheet) => {
    const lines: string[] = [];
    sheet.eachRow((row) => {
      const values = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
      lines.push(values.join(" | "));
    });
    pages.push({ page: null, content: `Planilha: ${sheet.name}\n${lines.join("\n")}` });
  });
  return { fullText: pages.map((p) => p.content).join("\n\n"), pages };
}

export async function parseCsvFile(buffer: Buffer): Promise<ParsedDocument> {
  const records: string[][] = parseCsv(buffer, { relax_column_count: true });
  const content = records.map((r) => r.join(" | ")).join("\n");
  return { fullText: content, pages: [{ page: null, content }] };
}

export async function parseTxt(buffer: Buffer): Promise<ParsedDocument> {
  const content = buffer.toString("utf-8");
  return { fullText: content, pages: [{ page: null, content }] };
}

export async function parseImageOcr(buffer: Buffer): Promise<ParsedDocument> {
  const worker = await createWorker("por");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return { fullText: text, pages: [{ page: null, content: text }] };
  } catch (err) {
    logger.error({ err }, "Falha ao executar OCR na imagem");
    throw new Error(
      "Não foi possível processar OCR desta imagem (verifique conectividade para baixar o modelo de linguagem na primeira execução)."
    );
  } finally {
    await worker.terminate();
  }
}

/** Divide o texto extraído em chunks para RAG/rastreabilidade (~1500 caracteres). */
export function chunkText(parsed: ParsedDocument, chunkSize = 1500): { page: number | null; order: number; content: string }[] {
  const chunks: { page: number | null; order: number; content: string }[] = [];
  let order = 0;
  for (const page of parsed.pages) {
    const text = page.content;
    for (let i = 0; i < text.length; i += chunkSize) {
      const slice = text.slice(i, i + chunkSize).trim();
      if (slice) {
        chunks.push({ page: page.page, order: order++, content: slice });
      }
    }
  }
  return chunks;
}
