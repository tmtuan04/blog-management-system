import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  /** Key dịch, component toast dịch khi hiện */
  key: string;
  params?: Record<string, unknown>;
}

/**
 * Hàng đợi thông báo dùng chung (docs/phase-4-frontend.md mục 3.7).
 *
 * A1 chỉ làm API để interceptor và các màn gọi được ngay. C1 làm component `app-toast`
 * (`.toast-container`, `.toast__icon`, tự ẩn) đọc `toasts()`, và có thể thêm hành vi,
 * nhưng giữ nguyên chữ ký `success(key, params?)`, `error(key, params?)`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<Toast[]>([]);

  readonly toasts = this.items.asReadonly();

  success(key: string, params?: Record<string, unknown>): void {
    this.push('success', key, params);
  }

  error(key: string, params?: Record<string, unknown>): void {
    this.push('error', key, params);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(
    type: ToastType,
    key: string,
    params?: Record<string, unknown>,
  ): void {
    const toast: Toast = { id: this.nextId++, type, key, params };
    this.items.update((list) => [...list, toast]);
  }
}
