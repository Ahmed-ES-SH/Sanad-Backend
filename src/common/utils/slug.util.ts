/**
 * Standard utility for generating SEO-friendly slugs.
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special chars
    .replace(/[\s_-]+/g, '-') // spaces/underscores to hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

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
}
