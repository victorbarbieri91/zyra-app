function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '-'
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function renderMarkdownTable(
  columns: string[],
  rows: Array<Record<string, unknown>>
): string {
  if (rows.length === 0) return ''

  const header = `| ${columns.join(' | ')} |`
  const divider = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows
    .map((row) => `| ${columns.map((column) => escapeCell(row[column])).join(' | ')} |`)
    .join('\n')

  return [header, divider, body].join('\n')
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function buildActionPreview(title: string, lines: string[]): string {
  const safeLines = lines.filter(Boolean)
  return [title, ...safeLines.map((line) => `- ${line}`)].join('\n')
}
