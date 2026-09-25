// Adaptador de armazenamento com interface compatível com S3.
// Implementação padrão: disco local. Trocar para S3 real basta implementar
// StorageDriver e ajustar a factory abaixo (variável STORAGE_DRIVER).
import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";

export interface StorageDriver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

class LocalStorageDriver implements StorageDriver {
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  private resolve(key: string): string {
    const safeKey = key.replace(/\.\./g, "");
    return path.join(this.root, safeKey);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  urlFor(key: string): string {
    return `/api/documents/file/${encodeURIComponent(key)}`;
  }
}

export const storage: StorageDriver = new LocalStorageDriver(
  path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH)
);
