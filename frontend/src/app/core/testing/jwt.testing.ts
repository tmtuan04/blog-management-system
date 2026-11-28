/**
 * Chỉ dùng trong file *.spec.ts: tạo access token giả có `exp`.
 * Chữ ký là chuỗi bất kỳ vì frontend không kiểm tra chữ ký.
 */
function base64url(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** @param expiresInSeconds âm là đã hết hạn */
export function fakeJwt(expiresInSeconds: number, sub = 1): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub, exp })}.signature`;
}
