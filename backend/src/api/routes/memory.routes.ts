import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { storage } from "../../documents/storage";
import { sha256 } from "../../utils/crypto";
import { recordAudit } from "../../audit/audit.service";
import { NotFoundError, AppError } from "../../utils/errors";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "MANAGER"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(`Tipo de arquivo não suportado: ${file.mimetype}`, 415));
  },
});

function urlFor(key: string): string {
  return `/api/memory/file/${encodeURIComponent(key)}`;
}

function serialize(template: Awaited<ReturnType<typeof prisma.memoryTemplate.findFirstOrThrow>>) {
  return { ...template, url: template.storageKey ? urlFor(template.storageKey) : null };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const templates = await prisma.memoryTemplate.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json(templates.map(serialize));
  })
);

const upsertSchema = z.object({
  type: z.enum(["DOCUMENT_TEMPLATE", "BPMN_PATTERN", "EXAMPLE_PROCESS"]),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
});

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const input = upsertSchema.parse(req.body);

    let storageKey: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;
    if (req.file) {
      const hash = sha256(req.file.buffer);
      storageKey = `${req.auth!.organizationId}/memory/${hash}-${req.file.originalname}`;
      await storage.put(storageKey, req.file.buffer);
      mimeType = req.file.mimetype;
      sizeBytes = req.file.size;
    }

    if (!storageKey && !input.content?.trim()) {
      throw new AppError("Informe um conteúdo em texto ou anexe um arquivo", 400);
    }

    const template = await prisma.memoryTemplate.create({
      data: {
        organizationId: req.auth!.organizationId,
        type: input.type,
        name: input.name,
        description: input.description || null,
        content: input.content || null,
        storageKey,
        mimeType,
        sizeBytes,
        createdById: req.auth!.userId,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "memory_template",
      entityId: template.id,
    });

    res.status(201).json(serialize(template));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.memoryTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new NotFoundError("Modelo não encontrado");
    await prisma.memoryTemplate.delete({ where: { id: existing.id } });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "DELETE",
      entity: "memory_template",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

router.get(
  "/file/:key",
  asyncHandler(async (req, res) => {
    const key = decodeURIComponent(req.params.key);
    if (!key.startsWith(req.auth!.organizationId)) {
      throw new NotFoundError("Arquivo não encontrado");
    }
    const buffer = await storage.get(key);
    res.send(buffer);
  })
);

export default router;
