import { ChangeDetectionStrategy, Component } from '@angular/core';
import { prefersReducedMotion } from '../core/motion';

interface Piece {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  color: string;
  shape: 'dot' | 'bar';
}

const COLORS = ['var(--gold)', '#8b5cf6', '#b9a3ff', 'var(--gold)', 'var(--coral)'];

/**
 * A single small burst of gold and purple confetti from the middle of its parent, about half a second
 * long. Shown once on RSVP success. Renders nothing when the user prefers reduced motion.
 */
@Component({
  selector: 'app-confetti',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (p of pieces; track $index) {
      <i [class]="p.shape" [style.--x.px]="p.x" [style.--y.px]="p.y" [style.--r.deg]="p.rotate"
         [style.animation-delay.ms]="p.delay" [style.background]="p.color"></i>
    }
  `,
  styles: `
    :host { position: absolute; left: 50%; top: 42%; width: 0; height: 0; pointer-events: none; z-index: 2; }
    i { position: absolute; left: 0; top: 0; opacity: 0; animation: burst 650ms cubic-bezier(0.15, 0.8, 0.3, 1) both; }
    .dot { width: 7px; height: 7px; border-radius: 50%; }
    .bar { width: 4px; height: 11px; border-radius: 2px; }
    @keyframes burst {
      0% { opacity: 1; transform: translate(0, 0) rotate(0) scale(0.6); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1); }
    }
  `,
})
export class Confetti {
  protected readonly pieces: Piece[] = prefersReducedMotion() ? [] : Confetti.burst(28);

  /** Pieces fly out in every direction, a little more upwards, with a small random spread. */
  static burst(count: number): Piece[] {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 70 + Math.random() * 90;
      return {
        x: Math.round(Math.cos(angle) * distance * 1.4),
        y: Math.round(Math.sin(angle) * distance - 30),
        rotate: Math.round(Math.random() * 540 - 270),
        delay: Math.round(Math.random() * 60),
        color: COLORS[i % COLORS.length],
        shape: i % 3 === 0 ? 'bar' : 'dot',
      };
    });
  }
}
