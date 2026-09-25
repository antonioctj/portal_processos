import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { uploadAndParseDocument } from "../../documents/document.service";
import { storage } from "../../documents/storage";
import { recordAudit } from "../../audit/audit.service";
import { NotFoundError, AppError } from "../../utils/errors";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(`Tipo de arquivo não suportado: ${file.mimetype}`, 415));
  },
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const documents = await prisma.document.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { processes: { include: { process: { select: { id: true, name: true } } } } },
    });
    res.json(documents);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { processes: { include: { process: { select: { id: true, name: true } } } } },
    });
    if (!document) throw new NotFoundError("Documento não encontrado");
    res.json(document);
  })
);

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
    const processId = req.body.processId as string | undefined;

    const { document } = await uploadAndParseDocument({
      organizationId: req.auth!.organizationId,
      uploadedById: req.auth!.userId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      processId,
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "document",
      entityId: document.id,
      processId: processId ?? null,
      documentId: document.id,
    });

    res.status(201).json(document);
  })
);

const linkSchema = z.object({ processId: z.string().uuid() });

router.post(
  "/:id/link",
  asyncHandler(async (req, res) => {
    const { processId } = linkSchema.parse(req.body);
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!document) throw new NotFoundError("Documento não encontrado");

    const link = await prisma.documentProcessLink.upsert({
      where: { documentId_processId: { documentId: document.id, processId } },
      create: { documentId: document.id, processId },
      update: {},
    });
    res.status(201).json(link);
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
