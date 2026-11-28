/**
 * Đọc `exp` của access token để refresh trước khi gửi request.
 * Chỉ đọc, không kiểm tra chữ ký: quyền thật vẫn do backend kiểm tra.
 */

/** Refresh sớm hơn hạn thật một chút để bù lệch giờ giữa máy và server, và thời gian request đi. */
const EXPIRY_SKEW_SECONDS = 10;

function decodePayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const json: unknown = JSON.parse(atob(padded));
    return typeof json === 'object' && json !== null
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** `true` nếu token đã hết hạn hoặc sắp hết hạn. Token không đọc được thì coi như chưa hết hạn, để backend quyết định. */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  const exp = decodePayload(token)?.['exp'];
  if (typeof exp !== 'number') return false;
  return exp - EXPIRY_SKEW_SECONDS <= now / 1000;
}
