import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { dateBlock } from '../core/format';

/** The square date badge on event cards and headers: big day number over a small month. */
@Component({
  selector: 'app-date-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="day">{{ parts().day }}</span>
    <span class="month">{{ parts().month }}</span>
  `,
  styles: `
    :host {
      display: grid; place-content: center; text-align: center; flex: none;
      width: 54px; height: 54px; border-radius: 14px;
      background: linear-gradient(160deg, #7c5cf0, var(--purple-strong));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 8px 20px -10px var(--purple-glow);
      color: #fff;
    }
    .day { font-size: 1.35rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
    .month { margin-top: 2px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  `,
})
export class DateBlock {
  readonly iso = input.required<string>();
  protected readonly parts = computed(() => dateBlock(this.iso()));
}
