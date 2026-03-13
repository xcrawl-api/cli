export function toMarkdown(title: string, content: string): string {
  return `# ${title}\n\n${content}`;
}
