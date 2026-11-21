import type { AuthUser } from '../../common/types/request-context';

/**
 * Quyền xóa mọi bình luận trên một bài (ma trận phân quyền, requirements mục 5):
 * Super Admin, hoặc Blog Owner là tác giả bài. Tác giả bài đã bị hạ xuống `user`
 * thì mất quyền này. Dùng cho `canDeleteComments` ở chi tiết bài (UC06).
 */
export function canModeratePostComments(
  viewer: AuthUser | undefined,
  postOwnerId: number,
): boolean {
  return (
    viewer !== undefined &&
    (viewer.role === 'super_admin' ||
      (viewer.role === 'blog_owner' && viewer.id === postOwnerId))
  );
}

/** Quyền xóa một bình luận (UC08): người viết, hoặc người có quyền trên cả bài */
export function canDeleteComment(
  viewer: AuthUser | undefined,
  commentUserId: number,
  postOwnerId: number,
): boolean {
  return (
    viewer !== undefined &&
    (viewer.id === commentUserId ||
      canModeratePostComments(viewer, postOwnerId))
  );
}
