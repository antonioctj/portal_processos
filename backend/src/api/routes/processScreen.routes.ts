import { Router } from "express";
import multer from "multer";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { storage } from "../../documents/storage";
import { sha256 } from "../../utils/crypto";
import { recordAudit } from "../../audit/audit.service";
import { NotFoundError, AppError } from "../../utils/errors";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — só imagens
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(`Tipo de arquivo não suportado: ${file.mimetype}`, 415));
  },
});

function urlFor(key: string): string {
  return `/api/screens/file/${encodeURIComponent(key)}`;
}

function serialize(screen: Awaited<ReturnType<typeof prisma.processScreen.findFirstOrThrow>>) {
  return { ...screen, url: urlFor(screen.storageKey) };
}

async function findProcessOrThrow(processId: string, organizationId: string) {
  const process = await prisma.process.findFirst({ where: { id: processId, organizationId } });
  if (!process) throw new NotFoundError("Processo não encontrado");
  return process;
}

router.get(
  "/processes/:processId/screens",
  asyncHandler(async (req, res) => {
    await findProcessOrThrow(req.params.processId, req.auth!.organizationId);
    const screens = await prisma.processScreen.findMany({
      where: { processId: req.params.processId },
      orderBy: { createdAt: "asc" },
    });
    res.json(screens.map(serialize));
  })
);

router.post(
  "/processes/:processId/screens",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const process = await findProcessOrThrow(req.params.processId, req.auth!.organizationId);
    if (!req.file) throw new AppError("Nenhuma imagem enviada", 400);

    const systemName = req.body.systemName as string | undefined;
    if (!systemName?.trim()) throw new AppError("Informe o sistema da tela", 400);

    const hash = sha256(req.file.buffer);
    const storageKey = `${req.auth!.organizationId}/screens/${hash}-${req.file.originalname}`;
    await storage.put(storageKey, req.file.buffer);

    const screen = await prisma.processScreen.create({
      data: {
        processId: process.id,
        systemName,
        stepName: (req.body.stepName as string | undefined) || null,
        description: (req.body.description as string | undefined) || null,
        storageKey,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        createdById: req.auth!.userId,
      },
    });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "CREATE",
      entity: "process_screen",
      entityId: screen.id,
      processId: process.id,
    });

    res.status(201).json(serialize(screen));
  })
);

router.delete(
  "/screens/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.processScreen.findFirst({
      where: { id: req.params.id, process: { organizationId: req.auth!.organizationId } },
    });
    if (!existing) throw new NotFoundError("Tela não encontrada");
    await prisma.processScreen.delete({ where: { id: existing.id } });

    await recordAudit({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      action: "DELETE",
      entity: "process_screen",
      entityId: existing.id,
      processId: existing.processId,
    });

    res.status(204).send();
  })
);

router.get(
  "/screens/file/:key",
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
