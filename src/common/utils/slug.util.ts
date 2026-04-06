
/**
 * Generates a unique slug by checking against the database using the provided repository.
 * If a slug already exists, it appends a counter (e.g., "my-slug-1").
 */
export async function generateUniqueSlug(
  title: string,
  repository: { findOne: (options: any) => Promise<any> },
): Promise<string> {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await repository.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
import { Repository, Not, ObjectLiteral } from 'typeorm';



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
