import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountUp } from './count-up';
import { Icon } from './icon';
import { Sparkline } from './sparkline';

export type KpiTint = 'purple' | 'green' | 'blue' | 'amber';

/** A change label under the number. "good" decides the color, since for no-shows down is good. */
export interface KpiChange {
  text: string;
  direction: 'up' | 'down' | 'flat';
  good: boolean;
}

const TINT_COLORS: Record<KpiTint, string> = {
  purple: 'var(--tint-purple)',
  green: 'var(--tint-green)',
  blue: 'var(--tint-blue)',
  amber: 'var(--tint-amber)',
};

/**
 * One key number: a tinted card with an icon chip, the value (which counts up), a change label or a
 * note, and either a small filled sparkline or a progress meter along the bottom.
 */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CountUp, Icon, Sparkline],
  host: {
    '[class]': '"card kpi tint-" + tint()',
    '[class.no-footer]': '!spark() && progress() === null',
    '[style.--tint]': 'color()',
  },
  template: `
    <div class="head">
      <span class="label">{{ label() }}</span>
      <span class="icon-chip"><app-icon [name]="icon()" [size]="16" /></span>
    </div>
    <div class="value">
      <app-count-up [value]="value()" [format]="format()" />@if (suffix()) {<small>{{ suffix() }}</small>}
    </div>
    @if (change(); as c) {
      <span class="change" [class.good]="c.good" [class.bad]="!c.good && c.direction !== 'flat'">
        @if (c.direction !== 'flat') { <app-icon [name]="c.direction === 'up' ? 'trend-up' : 'trend-down'" [size]="14" /> }
        {{ c.text }}
      </span>
    }
    @if (note()) {
      <span class="note">{{ note() }}</span>
    }
    @if (spark(); as values) {
      <app-sparkline class="spark" [values]="values" [color]="color()" [label]="sparkLabel()" />
    } @else if (progress() !== null) {
      <div class="meter" role="presentation"><span [style.width.%]="progressPercent()"></span></div>
    }
  `,
  styles: `
    :host {
      display: grid; align-content: start; gap: 4px; overflow: hidden; padding: 16px 16px 0;
      border-color: color-mix(in srgb, var(--tint) 22%, transparent);
      background:
        radial-gradient(120% 80% at 50% 120%, color-mix(in srgb, var(--tint) 22%, transparent), transparent 70%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 60%),
        var(--surface);
      transition: transform var(--dur) var(--ease), border-color var(--dur), box-shadow var(--dur);
    }
    @media (hover: hover) { :host(:hover) {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--tint) 45%, transparent);
      box-shadow: var(--highlight), 0 12px 30px -16px var(--tint);
    } }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .label { font-family: var(--font-serif); font-size: 0.95rem; font-weight: 520; }
    .icon-chip {
      display: grid; place-items: center; width: 28px; height: 28px; flex: none; border-radius: 9px;
      color: var(--tint); background: color-mix(in srgb, var(--tint) 16%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tint) 30%, transparent);
    }
    .value { font-size: 1.7rem; font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
    .value small { margin-left: 4px; font-size: 0.85rem; font-weight: 500; color: var(--muted); letter-spacing: 0; }
    .change, .note { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--muted); min-height: 18px; }
    .change.good { color: var(--success); }
    .change.bad { color: var(--danger); }
    .spark { margin: 6px -16px 0; height: 44px; }
    .meter { height: 5px; margin: 10px 0 16px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
    .meter span { display: block; height: 100%; border-radius: 3px; background: var(--tint);
      transform-origin: left; animation: fill var(--dur-slow) var(--ease) backwards; }
    @keyframes fill { from { transform: scaleX(0); } }
    :host(.no-footer) { padding-bottom: 16px; }
    @media (max-width: 640px) {
      :host { padding: 14px 14px 0; }
      :host(.no-footer) { padding-bottom: 14px; }
      .label { font-size: 0.86rem; }
      .icon-chip { width: 26px; height: 26px; }
      .value { font-size: 1.45rem; }
      .spark { margin: 4px -14px 0; height: 38px; }
      .meter { margin-bottom: 14px; }
    }
    @media (prefers-reduced-motion: reduce) { :host(:hover) { transform: none; } }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | null>();
  readonly format = input<'number' | 'percent'>('number');
  readonly suffix = input('');
  readonly icon = input('chart');
  readonly tint = input<KpiTint>('purple');
  readonly change = input<KpiChange | null>(null);
  readonly note = input('');
  /** Values for the sparkline; null for no sparkline. */
  readonly spark = input<number[] | null>(null);
  readonly sparkLabel = input('');
  /** 0 to 1 for a progress meter instead of a sparkline (e.g. seats filled). */
  readonly progress = input<number | null>(null);

  protected readonly color = computed(() => TINT_COLORS[this.tint()]);
  protected readonly progressPercent = computed(() => Math.min(100, Math.max(0, (this.progress() ?? 0) * 100)));
}
