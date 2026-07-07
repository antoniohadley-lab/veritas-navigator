/**
 * VROS Assignment ID — VFS-YYYY-000001 format.
 *
 * Every assignment gets a sequential ID from job one. Every photo, report,
 * affidavit, invoice, and archive folder references that ID.
 * Non-negotiable per Master Bible §9.
 *
 * Format: VFS-{YYYY}-{6-digit-zero-padded-sequence}
 * Example: VFS-2026-000001
 *
 * In production, `sequence` comes from the FieldJob table's count for the
 * current year (or a dedicated sequence counter). The function here handles
 * formatting — the caller owns persistence and uniqueness.
 */

export function formatAssignmentId(year: number, sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new Error(`Assignment sequence out of range: ${sequence}`);
  }
  return `VFS-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Parse an assignment ID back into its components for validation.
 * Returns null if the string does not match the VFS format.
 */
export function parseAssignmentId(
  id: string
): { year: number; sequence: number } | null {
  const match = id.match(/^VFS-(\d{4})-(\d{6})$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), sequence: parseInt(match[2], 10) };
}

/**
 * Generate the current year's assignment ID from a raw sequence number.
 * Convenience wrapper for new job creation.
 */
export function generateAssignmentId(sequence: number): string {
  return formatAssignmentId(new Date().getFullYear(), sequence);
}
