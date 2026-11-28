import { OperatorFunction, map } from 'rxjs';
import { ApiResponse, Paginated } from './api.models';

/**
 * Lấy `data` của response.
 *
 * @example this.http.get<ApiResponse<PostDetail>>(`/posts/${slug}`).pipe(unwrap())
 */
export function unwrap<T>(): OperatorFunction<ApiResponse<T>, T> {
  return map((res) => res.data);
}

/**
 * Lấy `{ items: data, meta }` của response phân trang.
 *
 * @example this.http.get<ApiResponse<PostCard[]>>('/posts', { params }).pipe(unwrapPage())
 */
export function unwrapPage<T>(): OperatorFunction<
  ApiResponse<T[]>,
  Paginated<T>
> {
  return map((res) => ({
    items: res.data,
    meta: res.meta ?? {
      page: 1,
      limit: res.data.length,
      total: res.data.length,
      totalPages: 1,
    },
  }));
}
