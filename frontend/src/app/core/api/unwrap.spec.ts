import { firstValueFrom, of } from 'rxjs';
import { ApiResponse } from './api.models';
import { unwrap, unwrapPage } from './unwrap';

describe('unwrap', () => {
  it('lấy data của response', async () => {
    const res: ApiResponse<{ id: number }> = {
      success: true,
      message: 'OK',
      data: { id: 1 },
    };
    expect(await firstValueFrom(of(res).pipe(unwrap()))).toEqual({ id: 1 });
  });
});

describe('unwrapPage', () => {
  it('trả items và meta', async () => {
    const meta = { page: 2, limit: 10, total: 25, totalPages: 3 };
    const res: ApiResponse<number[]> = {
      success: true,
      message: 'OK',
      data: [1, 2],
      meta,
    };
    expect(await firstValueFrom(of(res).pipe(unwrapPage()))).toEqual({
      items: [1, 2],
      meta,
    });
  });

  it('không có meta thì coi là một trang', async () => {
    const res: ApiResponse<number[]> = {
      success: true,
      message: 'OK',
      data: [1, 2, 3],
    };
    const page = await firstValueFrom(of(res).pipe(unwrapPage()));
    expect(page.meta).toEqual({ page: 1, limit: 3, total: 3, totalPages: 1 });
  });
});
