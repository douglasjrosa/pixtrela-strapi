/**
 * Reads a numeric entity id from Strapi relation shapes.
 * db.query populate may return `{ id }`, a bare number, or a numeric string.
 */
export function readRelationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (!value || typeof value !== 'object') return null;

  const record = value as { id?: unknown };
  if (record.id === undefined) return null;
  return readRelationId(record.id);
}
