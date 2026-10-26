import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';
export const DEFAULT_RESPONSE_MESSAGE = 'Thành công';

/** Message trong response thành công, ví dụ `@ResponseMessage('Lấy danh sách bài viết thành công')` */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
