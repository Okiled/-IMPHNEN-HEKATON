// sanitasi input untuk keamanan xss

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').slice(0, 500);
}

export function sanitizeProductName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/[^a-zA-Z0-9\s\-\_\.\,\(\)]/g, '').slice(0, 100);
}

export function sanitizeNumber(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(0, num);
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

export function sanitizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month}-${day}`;
}
