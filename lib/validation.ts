export function sanitizeString(val: unknown, maxLength = 255): string {
  if (typeof val !== 'string') return '';
  // Strip control characters and HTML tags to prevent XSS / injection
  const cleaned = val
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
  return cleaned.substring(0, maxLength);
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return re.test(email.trim()) && email.length <= 100;
}

export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  // Allow international and local formats: +62..., 08..., spaces, hyphens
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 18;
}

export function isValidISODate(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;

  const [y, m, day] = dateStr.split('-').map(Number);
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}

export function isDateTodayOrFuture(dateStr: string): boolean {
  if (!isValidISODate(dateStr)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(dateStr + 'T00:00:00');
  return checkDate.getTime() >= today.getTime();
}

export function isDateAfter(afterStr: string, beforeStr: string): boolean {
  if (!isValidISODate(afterStr) || !isValidISODate(beforeStr)) return false;
  const after = new Date(afterStr + 'T00:00:00Z');
  const before = new Date(beforeStr + 'T00:00:00Z');
  return after.getTime() > before.getTime();
}
