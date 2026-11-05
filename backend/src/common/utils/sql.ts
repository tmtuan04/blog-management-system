/** Escape ký tự đặc biệt của LIKE (`\`, `%`, `_`) để tìm đúng chữ người dùng gõ */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
