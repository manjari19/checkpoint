import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toasts } from '../core/toast';
import { Icon } from './icon';

/** Shows the toasts from the Toasts service in the bottom corner. Screen readers hear them politely. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts.items(); track toast.id) {
        <div class="toast" [class]="toast.tone" animate.enter="toast-in" animate.leave="toast-out">
          <span class="dot"><app-icon [name]="toast.tone === 'error' ? 'alert' : toast.tone === 'info' ? 'download' : 'check'" [size]="15" /></span>
          <span class="text">{{ toast.message }}</span>
          <button type="button" class="close" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss"><app-icon name="x" [size]="15" /></button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed; z-index: 100; right: 20px; bottom: 20px; display: grid; gap: 10px; justify-items: end;
      width: min(360px, calc(100vw - 32px)); pointer-events: none;
    }
    .toast {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 10px 10px 12px; pointer-events: auto;
      border-radius: 14px; border: 1px solid var(--border-strong); background: #1f1938; color: var(--text);
      box-shadow: var(--highlight), 0 16px 40px -12px rgba(0, 0, 0, 0.6);
      font-size: 0.8125rem; font-weight: 550;
    }
    .dot { display: grid; place-items: center; width: 26px; height: 26px; flex: none; border-radius: 50%; }
    .success .dot { background: rgba(74, 222, 128, 0.15); color: var(--success); }
    .info .dot { background: var(--purple-soft); color: var(--purple-text); }
    .error .dot { background: rgba(248, 113, 113, 0.15); color: var(--danger); }
    .text { flex: 1; min-width: 0; }
    .close { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 50%;
      background: none; color: var(--muted); cursor: pointer; }
    .close:hover { background: rgba(255, 255, 255, 0.06); color: var(--text); }
    .toast-in { animation: toast-in var(--dur) var(--ease) both; }
    .toast-out { animation: toast-in var(--dur-fast) ease-in reverse both; }
    @keyframes toast-in { from { opacity: 0; transform: translateX(24px); } }
    @media (max-width: 560px) {
      .stack { right: 16px; left: 16px; bottom: max(16px, env(safe-area-inset-bottom)); width: auto; justify-items: stretch; }
      @keyframes toast-in { from { opacity: 0; transform: translateY(16px); } }
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(Toasts);
}
