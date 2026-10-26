import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import {
  DEFAULT_RESPONSE_MESSAGE,
  RESPONSE_MESSAGE_KEY,
} from '../decorators/response-message.decorator';
import { PaginationMeta, isPaginated } from '../utils/paginate';

export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/** Bọc mọi response thành công theo format requirements 6.4 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessBody<unknown>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessBody<unknown>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_RESPONSE_MESSAGE;

    return next.handle().pipe(
      map((result) => {
        if (isPaginated(result)) {
          return {
            success: true,
            message,
            data: result.items,
            meta: result.meta,
          };
        }
        return { success: true, message, data: result ?? null };
      }),
    );
  }
}
