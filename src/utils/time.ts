export function nowIso(now: () => Date = () => new Date()): string {
  return now().toISOString();
}
