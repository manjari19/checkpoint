import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Points for a line through the values, scaled to fit width x height with a little padding. */
export function sparklinePoints(values: number[], width: number, height: number, pad = 3): [number, number][] {
  if (values.length === 0) {
    return [];
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((value, i) => [
    round(pad + i * step),
    round(height - pad - ((value - min) / range) * (height - pad * 2)),
  ]);
}

/**
 * A smooth SVG path through the points (monotone cubic), so the curve never overshoots the data:
 * it doesn't dip below zero or above the highest value.
 */
export function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  if (points.length < 3) return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const n = points.length;
  const dx = (i: number) => points[i + 1][0] - points[i][0];
  const slope = (i: number) => (points[i + 1][1] - points[i][1]) / (dx(i) || 1);
  // Tangent at each point: 0 at peaks and valleys, otherwise the average of the neighbouring slopes.
  const tangents = points.map((_, i) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const a = slope(i - 1);
    const b = slope(i);
    return a * b <= 0 ? 0 : (a + b) / 2;
  });
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = dx(i) / 3;
    d += ` C${round(x0 + third)} ${round(y0 + tangents[i] * third)} ${round(x1 - third)} ${round(y1 - tangents[i + 1] * third)} ${x1} ${y1}`;
  }
  return d;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

let nextId = 0;

/**
 * A small filled trend line for KPI cards. It sits under the number it belongs to, which names it,
 * so it carries no axes or legend; a summary is given to screen readers as a label.
 * The line draws itself in from left to right.
 */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (points().length > 1) {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" role="img"
           [attr.aria-label]="label()">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" [attr.stop-color]="color()" stop-opacity="0.35" />
            <stop offset="1" [attr.stop-color]="color()" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="area" [attr.d]="area()" [attr.fill]="'url(#' + gradientId + ')'" />
        <path class="line" [attr.d]="line()" fill="none" [attr.stroke]="color()" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    } @else {
      <span class="none">Not enough events yet</span>
    }
  `,
  styles: `
    :host { display: block; height: 40px; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
    // Revealed from left to right, so the line looks like it draws itself in.
    svg { animation: reveal var(--dur-slow) var(--ease) backwards; }
    @keyframes reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
    .none { display: block; padding: 10px 18px 0; font-size: 0.72rem; color: var(--subtle); }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();
  readonly color = input('var(--series-1)');
  readonly label = input('');

  protected readonly width = 120;
  protected readonly height = 40;
  protected readonly gradientId = `spark-${nextId++}`;

  protected readonly points = computed(() => sparklinePoints(this.values(), this.width, this.height, 4));
  protected readonly line = computed(() => smoothPath(this.points()));
  protected readonly area = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    return `${this.line()} L${pts[pts.length - 1][0]} ${this.height} L${pts[0][0]} ${this.height} Z`;
  });
}
