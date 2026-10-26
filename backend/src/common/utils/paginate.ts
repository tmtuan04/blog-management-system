export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGINATED = Symbol('paginated');

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
  [PAGINATED]: true;
}

/**
 * Service trả kết quả phân trang qua hàm này. TransformInterceptor tách `items`
 * vào `data` và `meta` vào `meta` (phase 3 doc mục 3.1).
 */
export function paginate<T>(
  items: T[],
  total: number,
  { page, limit }: { page: number; limit: number },
): Paginated<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    [PAGINATED]: true,
  };
}

export function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[PAGINATED] === true
  );
}

/** offset cho truy vấn Sequelize */
export function toOffset({ page, limit }: { page: number; limit: number }) {
  return { offset: (page - 1) * limit, limit };
}
