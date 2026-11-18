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

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

interface Bar {
  path: string;
  color: string;
}

interface Group {
  index: number;
  x: number;
  width: number;
  center: number;
  bars: Bar[];
}

const MARGIN = { top: 10, right: 8, bottom: 28, left: 36 };

/** Rounds a maximum up to 1, 2 or 5 times a power of ten, so the axis has tidy numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * power;
}

/** A bar with 4px rounded top corners, anchored flat on the baseline. */
export function barPath(x: number, top: number, width: number, baseline: number): string {
  const height = baseline - top;
  if (height <= 0 || width <= 0) return '';
  const r = Math.min(4, width / 2, height);
  return `M${x} ${baseline}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + width - r}`
    + `Q${x + width} ${top} ${x + width} ${top + r}V${baseline}Z`;
}

/**
 * Bar chart for one or two series over categories (events, or time buckets).
 *
 * Drawn as plain SVG sized to its container, so text stays readable at every screen width.
 * Hovering or focusing a category shows a tooltip with exact values, two or more series get a
 * legend, and "Show as table" gives the same numbers as a table.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <div class="legend">
        @for (s of series(); track s.name) {
          <span><i [style.background]="s.color"></i>{{ s.name }}</span>
        }
      </div>
    }

    @if (!showTable()) {
      <div class="plot" [style.height.px]="height()">
        @if (width() > 0) {
          <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="caption()">
            @for (tick of layout().ticks; track tick.value) {
              <line [attr.x1]="margin.left" [attr.x2]="width() - margin.right" [attr.y1]="tick.y" [attr.y2]="tick.y"
                    class="grid" />
              <text [attr.x]="margin.left - 8" [attr.y]="tick.y + 4" text-anchor="end" class="axis">{{ tick.value }}</text>
            }
            @for (group of layout().groups; track group.index) {
              @for (bar of group.bars; track $index) {
                <path class="bar" [attr.d]="bar.path" [attr.fill]="bar.color" [style.animation-delay.ms]="staggerDelay(group.index)"
                      [attr.opacity]="hovered() === null || hovered() === group.index ? 1 : 0.45" />
              }
              @if (layout().labelEvery > 0 && group.index % layout().labelEvery === 0) {
                <text [attr.x]="group.center" [attr.y]="height() - 8" text-anchor="middle" class="axis">
                  {{ shortLabel(labels()[group.index]) }}
                </text>
              }
              <rect class="hit" [attr.x]="group.x" [attr.y]="margin.top" [attr.width]="group.width"
                    [attr.height]="layout().baseline - margin.top" tabindex="0"
                    [attr.aria-label]="describe(group.index)"
                    (mouseenter)="hovered.set(group.index)" (mouseleave)="hovered.set(null)"
                    (focus)="hovered.set(group.index)" (blur)="hovered.set(null)" />
            }
            <line [attr.x1]="margin.left" [attr.x2]="width() - margin.right" [attr.y1]="layout().baseline"
                  [attr.y2]="layout().baseline" class="baseline" />
          </svg>
        }
        @if (hovered() !== null) {
          <div class="tooltip" [style.left.px]="tooltipLeft()" role="status">
            <strong>{{ fullLabel(hovered()!) }}</strong>
            @for (s of series(); track s.name) {
              <span><i [style.background]="s.color"></i>{{ s.name }} <b>{{ s.values[hovered()!] }}</b></span>
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
    .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 10px; font-size: 0.8125rem; color: var(--muted); }
    .legend span, .tooltip span { display: inline-flex; align-items: center; gap: 6px; }
    i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .plot { position: relative; width: 100%; }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 5; }
    // Bars grow up from the baseline, one after another from left to right.
    .bar { transform-box: fill-box; transform-origin: 50% 100%; animation: grow var(--dur-slow) var(--ease) backwards;
      transition: opacity var(--dur-fast); }
    @keyframes grow { from { transform: scaleY(0); } }
    .baseline { stroke: var(--border-strong); stroke-width: 1; }
    .axis { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .hit { fill: transparent; cursor: default; outline: none; }
    .hit:focus-visible { stroke: var(--focus); stroke-width: 2; }
    .tooltip {
      position: absolute; top: 0; transform: translateX(-50%); pointer-events: none;
      display: grid; gap: 4px; min-width: 140px; max-width: 220px; padding: 10px 12px;
      border-radius: 12px; border: 1px solid var(--border-strong); background: #120e22;
      font-size: 0.8125rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .tooltip strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tooltip b { margin-left: auto; padding-left: 12px; font-variant-numeric: tabular-nums; }
    .toggle { margin-top: 8px; padding: 4px 0; border: 0; background: none; color: var(--muted);
      font: inherit; font-size: 0.8125rem; text-decoration: underline; cursor: pointer; }
  `,
})
export class BarChart {
  /** Short label under each bar group. */
  readonly labels = input.required<string[]>();
  /** Optional longer label for the tooltip and table, e.g. the full event title. */
  readonly fullLabels = input<string[] | null>(null);
  readonly series = input.required<ChartSeries[]>();
  readonly height = input(220);
  /** What the chart shows, for screen readers. */
  readonly caption = input('');
  /** Column heading for the labels in table view. */
  readonly categoryName = input('Event');

  protected readonly margin = MARGIN;
  protected readonly width = signal(0);
  protected readonly hovered = signal<number | null>(null);
  protected readonly showTable = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly layout = computed(() => {
    const series = this.series();
    const count = this.labels().length;
    const width = this.width();
    const baseline = this.height() - MARGIN.bottom;
    const plotHeight = baseline - MARGIN.top;
    const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
    const y = (value: number) => baseline - (value / max) * plotHeight;

    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const groupWidth = count > 0 ? plotWidth / count : 0;
    const gap = 2;
    const barWidth = Math.max(2, Math.min(28, (groupWidth * 0.72 - gap * (series.length - 1)) / series.length));
    const clusterWidth = barWidth * series.length + gap * (series.length - 1);

    const groups: Group[] = Array.from({ length: count }, (_, index) => {
      const x = MARGIN.left + index * groupWidth;
      const start = x + (groupWidth - clusterWidth) / 2;
      return {
        index,
        x,
        width: groupWidth,
        center: x + groupWidth / 2,
        bars: series.map((s, si) => ({
          color: s.color,
          path: barPath(start + si * (barWidth + gap), y(s.values[index] ?? 0), barWidth, baseline),
        })),
      };
    });

    // Leave at least 64px per x-axis label so labels never collide.
    const labelEvery = groupWidth > 0 ? Math.ceil(64 / groupWidth) : 0;
    const ticks = [0, max / 2, max].map((value) => ({ value: Math.round(value * 10) / 10, y: y(value) }));
    return { groups, ticks, baseline, labelEvery };
  });

  protected readonly tooltipLeft = computed(() => {
    const index = this.hovered();
    if (index === null) return 0;
    const center = this.layout().groups[index]?.center ?? 0;
    // Keep the 220px-wide tooltip inside the chart.
    return Math.min(Math.max(center, 110), Math.max(110, this.width() - 110));
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

  /** Bars start one after another, but the whole chart is in place within half a second. */
  protected staggerDelay(index: number): number {
    return Math.round((index / Math.max(1, this.labels().length)) * 200);
  }

  protected fullLabel(index: number): string {
    return this.fullLabels()?.[index] ?? this.labels()[index] ?? '';
  }

  protected shortLabel(label: string | undefined): string {
    const text = label ?? '';
    const room = Math.max(4, Math.floor((this.layout().groups[0]?.width ?? 64) * this.layout().labelEvery / 7));
    return text.length > room ? `${text.slice(0, room - 1)}…` : text;
  }

  protected describe(index: number): string {
    return `${this.fullLabel(index)}: ` + this.series().map((s) => `${s.name} ${s.values[index]}`).join(', ');
  }
}
