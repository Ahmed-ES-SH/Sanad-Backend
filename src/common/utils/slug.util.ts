import { Repository, Not, ObjectLiteral } from 'typeorm';

/**
 * Generate a URL-friendly slug from a title string.
 * Lowercases, replaces whitespace with hyphens, strips non-alphanumeric chars.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by checking existence in the repository
 * and appending incremental suffixes if needed.
 */
export async function generateUniqueSlug<T extends ObjectLiteral>(
  title: string,
  repository: Repository<T>,
  slugColumn: string = 'slug',
  excludeId?: string,
): Promise<string> {
  const baseSlug = generateSlug(title);

  const whereBase: Record<string, unknown> = { [slugColumn]: baseSlug };
  if (excludeId) {
    whereBase.id = Not(excludeId);
  }
  const existing = await repository.findOne({ where: whereBase as any });

  if (!existing) {
    return baseSlug;
  }

  // Append incremental suffix
  let suffix = 1;
  while (true) {
    const candidate = `${baseSlug}-${suffix}`;
    const whereClause: Record<string, unknown> = { [slugColumn]: candidate };
    if (excludeId) {
      whereClause.id = Not(excludeId);
    }

    const exists = await repository.findOne({ where: whereClause as any });
    if (!exists) {
      return candidate;
    }
    suffix++;
  }
}
