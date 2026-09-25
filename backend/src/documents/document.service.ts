import { DocumentType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { storage } from "./storage";
import { sha256 } from "../utils/crypto";
import { logger } from "../config/logger";
import {
  chunkText,
  parseCsvFile,
  parseDocx,
  parseImageOcr,
  parsePdf,
  parseTxt,
  parseXlsx,
  type ParsedDocument,
} from "./parsers";

const EXTENSION_TYPE: Record<string, DocumentType> = {
  pdf: "PDF",
  docx: "DOCX",
  doc: "DOCX",
  xlsx: "XLSX",
  xls: "XLSX",
  csv: "CSV",
  txt: "TXT",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  webp: "IMAGE",
};

export function detectDocumentType(filename: string, mimeType: string): DocumentType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (EXTENSION_TYPE[ext]) return EXTENSION_TYPE[ext];
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word")) return "DOCX";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX";
  if (mimeType.includes("csv")) return "CSV";
  if (mimeType.includes("image")) return "IMAGE";
  if (mimeType.includes("text")) return "TXT";
  return "OTHER";
}

async function parseByType(type: DocumentType, buffer: Buffer): Promise<ParsedDocument> {
  switch (type) {
    case "PDF":
      return parsePdf(buffer);
    case "DOCX":
      return parseDocx(buffer);
    case "XLSX":
      return parseXlsx(buffer);
    case "CSV":
      return parseCsvFile(buffer);
    case "TXT":
      return parseTxt(buffer);
    case "IMAGE":
      return parseImageOcr(buffer);
    default:
      throw new Error(`Tipo de documento não suportado para extração: ${type}`);
  }
}

interface UploadInput {
  organizationId: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  processId?: string;
}

export async function uploadAndParseDocument(input: UploadInput) {
  const type = detectDocumentType(input.filename, input.mimeType);
  const hash = sha256(input.buffer);
  const storageKey = `${input.organizationId}/${hash}-${input.filename}`;

  await storage.put(storageKey, input.buffer);

  const document = await prisma.document.create({
    data: {
      organizationId: input.organizationId,
      uploadedById: input.uploadedById,
      name: input.filename,
      type,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      storageKey,
      hash,
      status: "PROCESSING",
    },
  });

  if (input.processId) {
    await prisma.documentProcessLink.create({
      data: { documentId: document.id, processId: input.processId },
    });
  }

  try {
    const parsed = await parseByType(type, input.buffer);
    const chunks = chunkText(parsed);

    await prisma.$transaction([
      prisma.documentChunk.createMany({
        data: chunks.map((c) => ({
          documentId: document.id,
          page: c.page,
          order: c.order,
          content: c.content,
        })),
      }),
      prisma.document.update({
        where: { id: document.id },
        data: { status: "PROCESSED" },
      }),
    ]);

    return { document, parsed };
  } catch (err) {
    logger.error({ err, documentId: document.id }, "Falha ao extrair conteúdo do documento");
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Erro desconhecido" },
    });
    throw err;
  }
}

export async function getDocumentFullText(documentId: string): Promise<string> {
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { order: "asc" },
  });
  return chunks.map((c) => c.content).join("\n\n");
}
