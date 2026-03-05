import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const GPX_STORAGE_DIR = path.join(process.cwd(), "data", "gpx");

const safeExt = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();
  return ext === ".gpx" || ext === ".xml" ? ext : ".gpx";
};

export const saveGpxFile = async (file: File) => {
  await fs.mkdir(GPX_STORAGE_DIR, { recursive: true });

  const uploadId = `${Date.now()}-${crypto.randomUUID()}${safeExt(file.name)}`;
  const filePath = path.join(GPX_STORAGE_DIR, uploadId);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filePath, bytes);

  return {
    uploadId,
    fileName: file.name,
  };
};

export const readGpxFile = async (uploadId: string) => {
  const filePath = path.join(GPX_STORAGE_DIR, uploadId);
  return fs.readFile(filePath, "utf8");
};

export const deleteGpxFile = async (uploadId: string) => {
  const filePath = path.join(GPX_STORAGE_DIR, uploadId);
  await fs.unlink(filePath);
};
