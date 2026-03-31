import path from 'node:path';

import { toStableJson } from '../formatters/json';
import { ensureDir, writeUtf8File } from './files';

export interface OutputContext {
  stdout: NodeJS.WritableStream;
}

export interface RenderOutputInput<T> {
  ctx: OutputContext;
  data: T;
  json?: boolean;
  outputPath?: string;
  renderText: (data: T, options?: { color: boolean }) => string;
}

export async function renderOutput<T>(input: RenderOutputInput<T>): Promise<void> {
  const json = input.json ?? false;
  const color = !input.outputPath && Boolean((input.ctx.stdout as NodeJS.WriteStream).isTTY);
  const content = json ? toStableJson(input.data) : `${input.renderText(input.data, { color })}\n`;

  if (input.outputPath) {
    await writeUtf8File(input.outputPath, content);
    input.ctx.stdout.write(`Saved output: ${input.outputPath}\n`);
    return;
  }

  input.ctx.stdout.write(content);
}

interface BatchOutputItem {
  fileName: string;
  content: string;
}

export async function writeBatchOutput(dirPath: string, items: BatchOutputItem[], stdout: NodeJS.WritableStream): Promise<void> {
  await ensureDir(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item.fileName);
    await writeUtf8File(fullPath, item.content);
    stdout.write(`Saved output: ${fullPath}\n`);
  }
}
