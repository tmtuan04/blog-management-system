import { Op, WhereOptions } from 'sequelize';
import slugifyLib from 'slugify';

export const SLUG_MAX_LENGTH = 250;

/** Bỏ dấu tiếng Việt (`đ → d`), chữ thường, nối bằng `-`, cắt còn `maxLength` ký tự */
export function toSlug(text: string, maxLength = SLUG_MAX_LENGTH): string {
  const plain = text
    .normalize('NFD')
    // Bỏ dấu thanh, dấu mũ (ký tự tổ hợp sau khi tách bằng NFD)
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return slugifyLib(plain, { lower: true, strict: true, trim: true })
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Model có cột slug và language_id (post_translations, category_translations) */
interface SlugModel {
  findAll(options: {
    where: WhereOptions;
    attributes: string[];
    raw: true;
  }): Promise<unknown[]>;
}

/**
 * Slug duy nhất trong cùng ngôn ngữ: trùng thì thêm `-2`, `-3`...
 * `excludeId` để bỏ qua chính bản ghi đang sửa.
 */
export async function generateUniqueSlug(
  text: string,
  languageId: number,
  model: SlugModel,
  options: { excludeId?: number; maxLength?: number } = {},
): Promise<string> {
  const base = toSlug(text, options.maxLength) || 'n-a';
  const where: Record<string | symbol, unknown> = {
    languageId,
    slug: { [Op.or]: [base, { [Op.like]: `${base}-%` }] },
  };
  if (options.excludeId !== undefined) {
    where.id = { [Op.ne]: options.excludeId };
  }
  const rows = (await model.findAll({
    where: where,
    attributes: ['slug'],
    raw: true,
  })) as { slug: string }[];
  const taken = new Set(rows.map((row) => row.slug));

  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }
  return `${base}-${suffix}`;
}
