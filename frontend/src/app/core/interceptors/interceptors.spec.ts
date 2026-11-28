import { provideApiTesting } from '../testing/provide-api-testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../api/api.models';
import { skipErrorToast } from '../api/http-context';
import { ToastService } from '../../shared/components/toast/toast.service';

describe('API_INTERCEPTORS', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => backend.verify());

  /** Gửi request, trả lỗi, trả về ApiError mà subscriber nhận được */
  function failWith(
    url: string,
    body: string | object,
    init: { status: number; statusText: string },
  ): unknown {
    let received: unknown;
    http.get(url).subscribe({ error: (e: unknown) => (received = e) });
    backend.expectOne(`/api/v1${url}`).flush(body, init);
    return received;
  }

  describe('apiUrlInterceptor', () => {
    it('thêm /api/v1 trước đường dẫn tương đối', () => {
      http.get('/posts').subscribe();
      backend.expectOne('/api/v1/posts').flush({});
    });

    it('giữ nguyên query string', () => {
      http
        .get('/admin/posts', { params: { status: 'draft', page: 2 } })
        .subscribe();
      const req = backend.expectOne((r) => r.url === '/api/v1/admin/posts');
      expect(req.request.urlWithParams).toBe(
        '/api/v1/admin/posts?status=draft&page=2',
      );
      req.flush({});
    });

    it('không thêm prefix cho URL đã có /api/v1, file dịch và URL tuyệt đối', () => {
      http.get('/api/v1/languages').subscribe();
      http.get('/i18n/vi.json').subscribe();
      http.get('https://example.com/a').subscribe();
      backend.expectOne('/api/v1/languages').flush({});
      backend.expectOne('/i18n/vi.json').flush({});
      backend.expectOne('https://example.com/a').flush({});
    });
  });

  describe('languageInterceptor', () => {
    it('gửi Accept-Language theo ngôn ngữ đang chọn cho request API', () => {
      http.get('/posts').subscribe();
      const req = backend.expectOne('/api/v1/posts');
      expect(req.request.headers.get('Accept-Language')).toBe('vi');
      req.flush({});
    });

    it('không gửi cho file dịch, không ghi đè header đã đặt sẵn', () => {
      http.get('/i18n/en.json').subscribe();
      http.get('/posts', { headers: { 'Accept-Language': 'en' } }).subscribe();
      const file = backend.expectOne('/i18n/en.json');
      const api = backend.expectOne('/api/v1/posts');
      expect(file.request.headers.has('Accept-Language')).toBe(false);
      expect(api.request.headers.get('Accept-Language')).toBe('en');
      file.flush({});
      api.flush({});
    });
  });

  describe('errorInterceptor', () => {
    it('đổi lỗi của backend thành ApiError, giữ errors[] theo field', () => {
      const body = {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        errors: [
          { field: 'translation.title', message: 'Tiêu đề là bắt buộc' },
        ],
      };
      const err = failWith('/admin/posts', body, {
        status: 400,
        statusText: 'Bad Request',
      });
      expect(err).toEqual<ApiError>({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        errors: [
          { field: 'translation.title', message: 'Tiêu đề là bắt buộc' },
        ],
      });
    });

    it('lỗi không có errors[] thì errors là mảng rỗng', () => {
      const body = {
        success: false,
        code: 'CATEGORY_IN_USE',
        message: 'Danh mục đang có bài viết',
      };
      const err = failWith('/admin/categories/1', body, {
        status: 409,
        statusText: 'Conflict',
      });
      expect(err).toMatchObject({
        status: 409,
        code: 'CATEGORY_IN_USE',
        errors: [],
      });
    });

    it('lỗi 4xx không hiện toast, để component tự xử lý', () => {
      const spy = vi.spyOn(toast, 'error');
      failWith(
        '/posts/khong-ton-tai',
        { success: false, code: 'NOT_FOUND', message: 'Không tìm thấy' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(spy).not.toHaveBeenCalled();
    });

    it('lỗi 500 hiện toast error.internal_error', () => {
      const spy = vi.spyOn(toast, 'error');
      const err = failWith(
        '/posts',
        { success: false, code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      expect(err).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
      expect(spy).toHaveBeenCalledWith('error.internal_error');
    });

    it('lỗi mạng thành status 0, NETWORK_ERROR và hiện toast error.network_error', () => {
      const spy = vi.spyOn(toast, 'error');
      let received: unknown;
      http.get('/posts').subscribe({ error: (e: unknown) => (received = e) });
      backend.expectOne('/api/v1/posts').error(new ProgressEvent('error'));
      expect(received).toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
        errors: [],
      });
      expect(spy).toHaveBeenCalledWith('error.network_error');
    });

    it('response lỗi không đúng format backend (proxy 504) coi như lỗi mạng', () => {
      const err = failWith('/posts', 'Gateway Timeout', {
        status: 504,
        statusText: 'Gateway Timeout',
      });
      expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    });

    it('skipErrorToast() tắt toast cho một request', () => {
      const spy = vi.spyOn(toast, 'error');
      let received: unknown;
      http
        .post('/uploads/images', {}, { context: skipErrorToast() })
        .subscribe({ error: (e: unknown) => (received = e) });
      backend
        .expectOne('/api/v1/uploads/images')
        .flush(
          { success: false, code: 'INTERNAL_ERROR', message: 'Lỗi' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      expect(received).toMatchObject({ code: 'INTERNAL_ERROR' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('lỗi của file dịch giữ nguyên HttpErrorResponse', () => {
      let received: unknown;
      http
        .get('/i18n/xx.json')
        .subscribe({ error: (e: unknown) => (received = e) });
      backend
        .expectOne('/i18n/xx.json')
        .flush('', { status: 404, statusText: 'Not Found' });
      expect(received).toMatchObject({
        name: 'HttpErrorResponse',
        status: 404,
      });
    });
  });
});
