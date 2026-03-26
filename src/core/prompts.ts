import { AuthError } from './errors';

const LINE_BUFFER = new WeakMap<NodeJS.ReadableStream, string>();

function splitBufferedLine(buffer: string): { line: string; remainder: string } | null {
  const newlineIndex = buffer.search(/\r?\n/);
  if (newlineIndex === -1) {
    return null;
  }

  return {
    line: buffer.slice(0, newlineIndex),
    remainder: buffer.slice(newlineIndex + (buffer[newlineIndex] === '\r' ? 2 : 1))
  };
}

async function readLine(input: NodeJS.ReadableStream): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    let settled = false;
    let buffer = LINE_BUFFER.get(input) ?? '';
    let onData: ((chunk: Buffer | string) => void) | undefined;
    let onEnd: (() => void) | undefined;
    let onError: ((error: Error) => void) | undefined;

    const cleanup = (): void => {
      if (onData) {
        input.off('data', onData);
      }

      if (onEnd) {
        input.off('end', onEnd);
      }

      if (onError) {
        input.off('error', onError);
      }

      input.pause();
    };

    const finish = (value: string | null): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const flushBufferedLine = (): boolean => {
      const buffered = splitBufferedLine(buffer);
      if (!buffered) {
        return false;
      }

      LINE_BUFFER.set(input, buffered.remainder);
      finish(buffered.line);
      return true;
    };

    if (flushBufferedLine()) {
      return;
    }

    if ('readableEnded' in input && input.readableEnded) {
      LINE_BUFFER.delete(input);
      finish(buffer.length > 0 ? buffer : null);
      return;
    }

    onData = (chunk: Buffer | string): void => {
      buffer += chunk.toString();
      flushBufferedLine();
    };

    onEnd = (): void => {
      LINE_BUFFER.delete(input);
      finish(buffer.length > 0 ? buffer : null);
    };
    onError = (error: Error): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    input.on('data', onData);
    input.once('end', onEnd);
    input.once('error', onError);
    input.resume();
  });
}

export async function promptLine(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  prompt: string
): Promise<string> {
  output.write(prompt);
  const line = await readLine(input);

  if (line === null) {
    throw new AuthError(
      'Interactive authentication was interrupted before a response was received.',
      'Run `xcrawl login --browser`, or set `XCRAWL_API_KEY` before retrying.'
    );
  }

  return line.trim();
}
