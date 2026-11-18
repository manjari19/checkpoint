import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ChartSeries, niceMax } from './bar-chart';
import { smoothPath } from './sparkline';

const MARGIN = { top: 14, right: 10, bottom: 28, left: 34 };

let nextId = 0;

/**
 * Smooth line chart for one or two series over ordered categories (recent events, oldest first).
 *
 * The second series is dashed, so the two lines differ by more than color. Hovering or focusing a
 * column highlights it and shows exact values; two series get a legend; "Show as table" gives the
 * same numbers as a table. The lines are revealed from left to right when the chart appears.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <div class="legend">
        @for (s of series(); track s.name; let i = $index) {
          <span><i class="swatch" [class.dashed]="i === 1" [style.--c]="s.color"></i>{{ s.name }}</span>
        }
      </div>
    }

    @if (!showTable()) {
      <div class="plot" [style.height.px]="height()">
        @if (width() > 0) {
          <svg class="axes" [attr.width]="width()" [attr.height]="height()" aria-hidden="true">
            @for (tick of layout().ticks; track tick.value) {
              <line [attr.x1]="margin.left" [attr.x2]="width() - margin.right" [attr.y1]="tick.y" [attr.y2]="tick.y" class="grid" />
              <text [attr.x]="margin.left - 8" [attr.y]="tick.y + 4" text-anchor="end" class="axis">{{ tick.value }}</text>
            }
            @if (hovered() !== null) {
              <rect class="band" [attr.x]="layout().points[hovered()!].x - layout().step / 2" [attr.y]="margin.top"
                    [attr.width]="layout().step" [attr.height]="layout().baseline - margin.top + 22" rx="10"
                    [attr.fill]="'url(#' + id + '-band)'" />
            }
            @for (p of layout().points; track $index) {
              @if (layout().labelEvery > 0 && $index % layout().labelEvery === 0) {
                <text [attr.x]="p.x" [attr.y]="height() - 8" text-anchor="middle" class="axis"
                      [class.on]="hovered() === $index">{{ shortLabel(labels()[$index]) }}</text>
              }
            }
            <defs>
              <linearGradient [attr.id]="id + '-band'" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.05" />
                <stop offset="1" stop-color="#8b5cf6" stop-opacity="0.32" />
              </linearGradient>
              <linearGradient [attr.id]="id + '-area'" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" [attr.stop-color]="series()[0]?.color" stop-opacity="0.28" />
                <stop offset="1" [attr.stop-color]="series()[0]?.color" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <svg class="marks" [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="caption()">
            <path [attr.d]="layout().area" [attr.fill]="'url(#' + id + '-area)'" />
            @for (line of layout().lines; track $index) {
              <path [attr.d]="line.d" fill="none" [attr.stroke]="line.color" stroke-width="2.5"
                    stroke-linecap="round" [attr.stroke-dasharray]="$index === 1 ? '6 6' : null" />
            }
            @if (hovered() !== null) {
              @for (line of layout().lines; track $index) {
                <circle [attr.cx]="layout().points[hovered()!].x" [attr.cy]="line.ys[hovered()!]" r="5"
                        [attr.fill]="line.color" class="dot" />
              }
            }
            @for (p of layout().points; track $index) {
              <rect class="hit" [attr.x]="p.x - layout().step / 2" [attr.y]="margin.top" [attr.width]="layout().step"
                    [attr.height]="layout().baseline - margin.top" tabindex="0" [attr.aria-label]="describe($index)"
                    (mouseenter)="hovered.set($index)" (mouseleave)="hovered.set(null)"
                    (focus)="hovered.set($index)" (blur)="hovered.set(null)" />
            }
          </svg>
        }
        @if (hovered() !== null) {
          <div class="tooltip" [style.left.px]="tooltipLeft()" role="status">
            <strong>{{ fullLabel(hovered()!) }}</strong>
            @for (s of series(); track s.name; let i = $index) {
              <span><i class="swatch" [class.dashed]="i === 1" [style.--c]="s.color"></i>{{ s.name }} <b>{{ s.values[hovered()!] }}</b></span>
            }
          </div>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>{{ categoryName() }}</th>@for (s of series(); track s.name) {<th class="num">{{ s.name }}</th>}</tr></thead>
          <tbody>
            @for (label of labels(); track $index; let row = $index) {
              <tr><td>{{ fullLabel(row) }}</td>@for (s of series(); track s.name) {<td class="num">{{ s.values[row] }}</td>}</tr>
            }
          </tbody>
        </table>
      </div>
    }
    <button type="button" class="toggle" (click)="showTable.set(!showTable())">
      {{ showTable() ? 'Show as chart' : 'Show as table' }}
    </button>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 8px; font-size: 0.78rem; color: var(--muted); }
    .legend span, .tooltip span { display: inline-flex; align-items: center; gap: 7px; }
    .swatch { display: inline-block; width: 16px; height: 0; border-top: 2.5px solid var(--c); border-radius: 2px; }
    .swatch.dashed { border-top-style: dashed; }
    .plot { position: relative; width: 100%; }
    svg { display: block; overflow: visible; }
    .marks { position: absolute; inset: 0; animation: reveal var(--dur-slow) var(--ease) backwards; }
    @keyframes reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
    .grid { stroke: var(--border); stroke-dasharray: 3 5; }
    .axis { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .axis.on { fill: var(--text); font-weight: 600; }
    .dot { stroke: var(--surface); stroke-width: 2; }
    .hit { fill: transparent; outline: none; }
    .hit:focus-visible { stroke: var(--focus); stroke-width: 2; }
    .tooltip {
      position: absolute; top: -6px; transform: translateX(-50%); pointer-events: none;
      display: grid; gap: 4px; min-width: 150px; max-width: 230px; padding: 10px 12px;
      border-radius: 12px; border: 1px solid var(--border-strong); background: #120e22;
      font-size: 0.78rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    }
    .tooltip strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tooltip b { margin-left: auto; padding-left: 12px; font-variant-numeric: tabular-nums; }
    .toggle { margin-top: 6px; padding: 4px 0; border: 0; background: none; color: var(--muted);
      font: inherit; font-size: 0.78rem; text-decoration: underline; cursor: pointer; }
  `,
})
export class LineChart {
  readonly labels = input.required<string[]>();
  readonly fullLabels = input<string[] | null>(null);
  readonly series = input.required<ChartSeries[]>();
  readonly height = input(230);
  readonly caption = input('');
  readonly categoryName = input('Event');

  protected readonly margin = MARGIN;
  protected readonly id = `line-${nextId++}`;
  protected readonly width = signal(0);
  protected readonly hovered = signal<number | null>(null);
  protected readonly showTable = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly layout = computed(() => {
    const series = this.series();
    const count = this.labels().length;
    const baseline = this.height() - MARGIN.bottom;
    const plotHeight = baseline - MARGIN.top;
    const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
    const y = (value: number) => Math.round((baseline - (value / max) * plotHeight) * 10) / 10;

    // Each category gets an equal column; its point sits in the middle of the column.
    const step = count > 0 ? Math.max(0, this.width() - MARGIN.left - MARGIN.right) / count : 0;
    const points = Array.from({ length: count }, (_, i) => ({ x: Math.round((MARGIN.left + step * (i + 0.5)) * 10) / 10 }));

    const lines = series.map((s) => {
      const ys = points.map((_, i) => y(s.values[i] ?? 0));
      return { color: s.color, ys, d: smoothPath(points.map((p, i) => [p.x, ys[i]] as [number, number])) };
    });
    const first = lines[0];
    const area = first && points.length > 1
      ? `${first.d} L${points[points.length - 1].x} ${baseline} L${points[0].x} ${baseline} Z`
      : '';

    const labelEvery = step > 0 ? Math.ceil(64 / step) : 0;
    const ticks = [0, max / 2, max].map((value) => ({ value: Math.round(value * 10) / 10, y: y(value) }));
    return { points, lines, area, ticks, baseline, step, labelEvery };
  });

  protected readonly tooltipLeft = computed(() => {
    const index = this.hovered();
    if (index === null) return 0;
    const x = this.layout().points[index]?.x ?? 0;
    return Math.min(Math.max(x, 115), Math.max(115, this.width() - 115));
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        this.width.set(host.clientWidth || 600);
        return;
      }
      const observer = new ResizeObserver(([entry]) => this.width.set(Math.floor(entry.contentRect.width)));
      observer.observe(host);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected fullLabel(index: number): string {
    return this.fullLabels()?.[index] ?? this.labels()[index] ?? '';
  }

  protected shortLabel(label: string | undefined): string {
    const text = label ?? '';
    const room = Math.max(4, Math.floor((this.layout().step * this.layout().labelEvery) / 7));
    return text.length > room ? `${text.slice(0, room - 1)}…` : text;
  }

  protected describe(index: number): string {
    return `${this.fullLabel(index)}: ` + this.series().map((s) => `${s.name} ${s.values[index]}`).join(', ');
  }
}
