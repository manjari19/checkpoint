import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { formatPercent } from '../core/format';
import { animateValue } from '../core/motion';

/**
 * A number that counts to its value: up from 0 when it first appears, and from the old value to the
 * new one when it changes (a waitlist position counting down as people ahead cancel, for example).
 * Takes 300ms. Shows the final value at once when the user prefers reduced motion.
 */
@Component({
  selector: 'app-count-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
  styles: `:host { font-variant-numeric: tabular-nums; }`,
})
export class CountUp {
  /** A count, or a fraction (0.25) when format is 'percent'. Null shows a dash. */
  readonly value = input.required<number | null>();
  readonly format = input<'number' | 'percent'>('number');
  /** Show the first value as it is and only animate later changes (used for waitlist positions). */
  readonly startAtValue = input(false);

  protected readonly text = signal('');
  private shown = 0;
  private first = true;
  private stop: () => void = () => undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      const target = this.value();
      const format = this.format();
      untracked(() => this.animateTo(target, format));
    });
  }

  private animateTo(target: number | null, format: 'number' | 'percent'): void {
    this.stop();
    if (target === null) {
      this.text.set('–');
      return;
    }
    if (this.first && this.startAtValue()) {
      this.first = false;
      this.shown = target;
      this.text.set(format === 'percent' ? formatPercent(target) : String(target));
      return;
    }
    this.first = false;
    const from = this.shown;
    this.stop = animateValue(300, (progress) => {
      this.shown = from + (target - from) * progress;
      this.text.set(format === 'percent' ? formatPercent(this.shown) : String(Math.round(this.shown)));
    });
  }
}
