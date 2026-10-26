const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Đổi chuỗi thời gian dạng `15m`, `7d`, `60` (giây) ra số giây. */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd]?)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Thời gian không hợp lệ: ${value}`);
  }
  return Number(match[1]) * UNIT_SECONDS[match[2] || 's'];
}
