import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** How far down (px) or how fast (px/ms) a drag must go to dismiss the sheet. */
export const DISMISS_DISTANCE = 90;
export const DISMISS_SPEED = 0.6;

/** Whether a finished drag should close the sheet: far enough down, or a quick downward flick. */
export function shouldDismiss(distance: number, durationMs: number): boolean {
  return distance > DISMISS_DISTANCE || (distance > 20 && distance / Math.max(1, durationMs) > DISMISS_SPEED);
}

/**
 * A bottom sheet on phones and a centered dialog on wider screens, for confirmations and short menus.
 *
 * The parent decides when it exists (put it inside an @if) and removes it on (closed). It can be closed
 * with the backdrop, the Escape key, or on phones by dragging the handle down. Use it with
 * animate.enter="sheet-in" animate.leave="sheet-out" for the slide in and out.
 */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'closed.emit()',
    '[style.--drag.px]': 'drag()',
    '[class.dragging]': 'dragging()',
  },
  template: `
    <div class="scrim" (click)="closed.emit()" aria-hidden="true"></div>
    <section #panel class="panel" role="dialog" aria-modal="true" [attr.aria-label]="label()" tabindex="-1">
      <div class="handle-area" (pointerdown)="startDrag($event)" (pointermove)="moveDrag($event)"
           (pointerup)="endDrag()" (pointercancel)="endDrag()">
        <span class="handle" aria-hidden="true"></span>
      </div>
      <ng-content />
    </section>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 16px; }
    .scrim { position: absolute; inset: 0; background: rgba(5, 4, 12, 0.62); backdrop-filter: blur(2px); }
    .panel {
      position: relative; width: min(420px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto;
      display: grid; gap: 10px; padding: 8px 20px 20px; border-radius: 22px; outline: none;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 120px), #1a1530;
      border: 1px solid var(--border-strong); box-shadow: var(--highlight), 0 30px 80px -20px rgba(0, 0, 0, 0.7);
      transform: translateY(var(--drag, 0px));
    }
    .handle-area { display: none; }

    :host(.sheet-in) { animation: fade-in var(--dur) ease-out both; }
    :host(.sheet-in) .panel { animation: dialog-in 280ms var(--spring) both; }
    :host(.sheet-out) { animation: fade-in 200ms ease-in reverse both; }
    :host(.sheet-out) .panel { animation: dialog-in 200ms ease-in reverse both; }
    @keyframes dialog-in { from { opacity: 0; transform: scale(0.94); } }

    @media (max-width: 640px) {
      :host { place-items: end stretch; padding: 0; }
      .panel {
        width: 100%; max-height: 88dvh; padding: 0 18px max(20px, env(safe-area-inset-bottom));
        border-radius: 24px 24px 0 0; border-bottom: 0;
      }
      :host(:not(.dragging)) .panel { transition: transform 220ms var(--spring); }
      .handle-area { display: grid; place-items: center; height: 26px; margin: 0 -18px; cursor: grab; touch-action: none; }
      .handle { width: 40px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.28); }
      :host(.sheet-in) .panel { animation: sheet-up 340ms var(--spring) both; }
      :host(.sheet-out) .panel { animation: sheet-down 220ms ease-in both; }
      @keyframes sheet-up { from { transform: translateY(100%); } }
      @keyframes sheet-down { from { transform: translateY(var(--drag, 0px)); } to { transform: translateY(100%); } }
    }
  `,
})
export class Sheet {
  /** What the sheet is about, for screen readers. */
  readonly label = input('');
  readonly closed = output<void>();

  protected readonly drag = signal(0);
  protected readonly dragging = signal(false);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private startY = 0;
  private startTime = 0;

  constructor() {
    // Move focus into the sheet, and give it back to whatever opened it once the sheet is gone.
    const opener = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    afterNextRender(() => this.panel().nativeElement.focus());
    inject(DestroyRef).onDestroy(() => opener?.focus?.());
  }

  protected startDrag(event: PointerEvent): void {
    this.dragging.set(true);
    this.startY = event.clientY;
    this.startTime = performance.now();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected moveDrag(event: PointerEvent): void {
    if (!this.dragging()) return;
    const dy = event.clientY - this.startY;
    // Follows the finger downwards; resists being pulled up.
    this.drag.set(dy > 0 ? dy : dy * 0.2);
  }

  protected endDrag(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    if (shouldDismiss(this.drag(), performance.now() - this.startTime)) {
      this.closed.emit();
    } else {
      this.drag.set(0);
    }
  }
}
