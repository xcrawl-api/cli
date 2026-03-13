export interface TableColumn<T> {
  key: keyof T;
  title: string;
}

export function renderTable<T extends object>(rows: T[], columns: Array<TableColumn<T>>): string {
  if (rows.length === 0) {
    return 'No results.';
  }

  const widths = columns.map((column) => {
    const cellWidth = rows.reduce((max, row) => {
      const value = (row as Record<string, unknown>)[String(column.key)];
      return Math.max(max, String(value ?? '').length);
    }, column.title.length);
    return cellWidth;
  });

  const renderRow = (values: string[]): string => values.map((value, idx) => value.padEnd(widths[idx])).join('  ');
  const header = renderRow(columns.map((column) => column.title));
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows
    .map((row) => renderRow(columns.map((column) => String((row as Record<string, unknown>)[String(column.key)] ?? ''))))
    .join('\n');

  return `${header}\n${separator}\n${body}`;
}
