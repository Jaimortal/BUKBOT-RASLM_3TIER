import path from "path";
import { promises as fsPromises } from "fs";

const BACKUP_ROOT = path.join(process.cwd(), "backups", "json");

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function backupJsonFile(filePath: string, label = "json"): Promise<string> {
  const parsed = path.parse(filePath);
  const backupDir = path.join(BACKUP_ROOT, label);
  const backupName = `${parsed.name}.${timestamp()}${parsed.ext}`;
  const backupPath = path.join(backupDir, backupName);

  await fsPromises.mkdir(backupDir, { recursive: true });
  try {
    await fsPromises.access(filePath);
  } catch {
    return "";
  }
  await fsPromises.copyFile(filePath, backupPath);

  return backupPath;
}
