import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { OutputError } from './errors';

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new OutputError(`Failed to create directory: ${dirPath}`, 'Please check permissions or the output path.', error);
  }
}

export async function writeUtf8File(filePath: string, content: string): Promise<void> {
  const dirPath = path.dirname(filePath);
  await ensureDir(dirPath);

  try {
    await writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new OutputError(`Failed to write file: ${filePath}`, 'Please check the file path or disk permissions.', error);
  }
}

export function toSafeFileName(input: string): string {
  return input
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'result';
}
