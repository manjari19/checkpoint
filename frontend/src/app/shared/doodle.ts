import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type DoodleName =
  | 'ticket' | 'badge' | 'people' | 'door' | 'calendar' | 'chart' | 'search' | 'gift'
  | 'laptop' | 'mic' | 'balloons' | 'code' | 'star';

/**
 * Small hand-drawn line illustrations (slightly wobbly strokes, round ends) in a soft ink with gold and
 * coral accents. They give empty states, the login page and the public pages some warmth.
 * Purely decorative: the text next to them always says what they show.
 */
@Component({
  selector: 'app-doodle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 120 96" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      @switch (name()) {
        @case ('ticket') {
          <g transform="rotate(-7 60 48)">
            <path class="ink" d="M22 29c24-1.5 50-1 76 .5l-.4 11.5c-4 .4-6.6 3.4-6.4 7.2.2 3.6 3 6.2 6.8 6.4l.2 12.2c-25 1.2-51 1-76-.4l.3-11.8c3.8-.4 6.4-3.2 6.2-7-.2-3.7-3-6.3-6.8-6.5z" />
            <path class="gold" d="M78 31.5v34" stroke-dasharray="2.5 5" />
            <path class="ink" d="M33 41.5c9-.6 18-.5 27 0M33 50c6-.4 12-.3 18 0M33 58.5c8-.4 16-.3 22 0" />
            <path class="coral" d="M88.5 42.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" />
          </g>
          <path class="gold" d="M16 14v8M12 18h8M104 72v8M100 76h8" />
          <circle class="coral fill" cx="104" cy="18" r="2.6" />
          <circle class="gold fill" cx="14" cy="74" r="1.8" />
        }
        @case ('badge') {
          <path class="ink" d="M42 4c3 12 9 21 15.5 26.5M78 4c-3 12-9 21-15.5 26.5" />
          <path class="ink" d="M38 35c15-1.2 29-1.2 44 0 1 16 1 32 0 48-15 1.2-29 1.2-44 0-1-16-1-32 0-48z" />
          <path class="gold" d="M38.4 46.5c14.4-.8 28.8-.8 43.2 0" />
          <circle class="coral" cx="60" cy="61" r="7.5" />
          <path class="coral" d="M57 62.8c1.6 1.8 4.4 1.8 6 0" />
          <path class="ink" d="M48 76c8-.5 16-.5 24 0" />
          <path class="gold" d="M98 26v8M94 30h8M22 60v6M19 63h6" />
          <circle class="coral fill" cx="96" cy="66" r="2.2" />
        }
        @case ('people') {
          <circle class="ink" cx="40" cy="38" r="9" />
          <path class="ink" d="M23 76c1.5-13 8-20.5 17-20.5S55.5 63 57 76" />
          <circle class="gold" cx="80" cy="33" r="10" />
          <path class="gold" d="M61 76c1.8-15 9.5-23.5 19-23.5S97.2 61 99 76" />
          <path class="coral" d="M55.5 19c0-3 3.6-4.2 5-1.4 1.4-2.8 5-1.6 5 1.4 0 3.6-5 6.6-5 6.6s-5-3-5-6.6z" />
          <path class="ink" d="M14 82c30 2 62 2 92 0" />
          <path class="gold" d="M106 18v8M102 22h8" />
          <circle class="coral fill" cx="14" cy="26" r="2" />
        }
        @case ('door') {
          <path class="ink" d="M36 84V17c13-1 26-1 40 0v67" />
          <path class="gold" d="M36 17.5l21 6.5v64l-21-4" />
          <circle class="gold fill" cx="52" cy="56" r="1.9" />
          <path class="gold" d="M84 34l9-4M86 50h11M84 66l9 4" />
          <path class="ink" d="M12 84c13 .6 18 .6 24 0M76 84c10 .6 20 .6 32 0" />
          <path class="coral" d="M62 89c8 .7 17 .7 25 0" />
          <path class="coral" d="M20 22v8M16 26h8" />
          <circle class="gold fill" cx="104" cy="16" r="2.2" />
        }
        @case ('calendar') {
          <path class="ink" d="M28 24c21-1 43-1 64 0 1 19 1 38 0 57-21 1-43 1-64 0-1-19-1-38 0-57z" />
          <path class="ink" d="M28.5 37c21-.8 42-.8 63 0" />
          <path class="gold" d="M43 17v13M77 17v13" />
          <path class="ink" d="M39 50h2M51 50h2M63 50h2M75 50h2M39 62h2M51 62h2M63 62h2M39 72h2M51 72h2M63 72h2M75 72h2" stroke-width="2.6" />
          <path class="coral" d="M71 57.5c6-3.2 13.5.4 13 5.6s-9.2 7.2-13.4 3.6c-3.6-3.1-2.6-7.4.4-9.2z" />
          <path class="gold" d="M104 14v8M100 18h8" />
          <circle class="coral fill" cx="16" cy="70" r="2.2" />
        }
        @case ('chart') {
          <path class="ink" d="M18 82c28 1 56 1 84 0" />
          <path class="ink" d="M29 81.5c-.3-6.5-.2-13 0-19.5 3.3-.3 6.7-.3 10 0 .3 6.5.2 13 0 19.5" />
          <path class="ink" d="M47 81.5c-.3-10-.2-20 0-30 3.3-.3 6.7-.3 10 0 .3 10 .2 20 0 30" />
          <path class="ink" d="M65 81.5c-.3-8-.2-16 0-24 3.3-.3 6.7-.3 10 0 .3 8 .2 16 0 24" />
          <path class="gold" d="M83 81.5c-.3-14-.2-28 0-42 3.3-.3 6.7-.3 10 0 .3 14 .2 28 0 42" />
          <path class="coral" d="M24 52c11-5 21-9 32-16 8-5 15-9 26-16" />
          <path class="coral" d="M75 18.5l7.5-.5-1.5 7" />
          <circle class="gold fill" cx="104" cy="22" r="2.2" />
        }
        @case ('search') {
          <circle class="ink" cx="52" cy="42" r="20" />
          <path class="ink" d="M66.5 56.5l17 17" stroke-width="4" />
          <path class="gold" d="M41 35c2-4 6-6.6 10.5-6.6" />
          <path class="coral" d="M92 22v8M88 26h8" />
          <path class="gold" d="M22 64v6M19 67h6" />
          <circle class="coral fill" cx="98" cy="62" r="2.2" />
        }
        @case ('gift') {
          <path class="ink" d="M31 45c19-1 39-1 58 0l-.6 37c-19 1-38 1-57 0z" />
          <path class="ink" d="M26 34.5c22-1 46-1 68 0l-.3 10.5c-22 1-45 1-67.4 0z" />
          <path class="gold" d="M60 35v47" />
          <path class="coral" d="M60 33.5c-6-10-18-12-17-4 1 6 11 5 17 4zM60 33.5c6-10 18-12 17-4-1 6-11 5-17 4z" />
          <path class="gold" d="M100 20v8M96 24h8" />
          <circle class="coral fill" cx="18" cy="64" r="2.2" />
        }
        @case ('laptop') {
          <path class="ink" d="M32 26c19-1 37-1 56 0 .8 12.5.8 25 0 37.5-19 1-37 1-56 0-.8-12.5-.8-25 0-37.5z" />
          <path class="ink" d="M20 70c27-1.4 53-1.4 80 0-2 5-5 8-8 8-21 .8-43 .8-64 0-3 0-6-3-8-8z" />
          <path class="gold" d="M47 39l-6 5.5 6 5.5M73 39l6 5.5-6 5.5" />
          <path class="coral" d="M63 37l-6 15" />
          <path class="gold" d="M104 18v8M100 22h8" />
        }
        @case ('mic') {
          <path class="ink" d="M51 24c0-6 4-10 9-10s9 4 9 10v18c0 6-4 10-9 10s-9-4-9-10z" />
          <path class="ink" d="M43 40c0 11 7.5 18 17 18s17-7 17-18M60 58v16M48 76c8-.8 16-.8 24 0" />
          <path class="gold" d="M83 25c4.5 4.5 4.5 13 0 17.5M90 19c8 8 8 22 0 30" />
          <path class="coral" d="M37 25c-4.5 4.5-4.5 13 0 17.5M30 19c-8 8-8 22 0 30" />
        }
        @case ('balloons') {
          <path class="coral" d="M46 14c-9 0-15 8-14 17 1 8 7 14 14 14s13-6 14-14c1-9-5-17-14-17z" />
          <path class="gold" d="M75 22c-8 0-13.5 7-12.5 15 .8 7 6 12.5 12.5 12.5S87.5 44 88.1 37C89 29 83 22 75 22z" />
          <path class="ink" d="M46 45c-2 8 4 14 0 22s3 12 6 16M75 49.5c1 8-5 12-2 20s-6 10-12 14" />
          <path class="gold" d="M18 60v8M14 64h8" />
          <circle class="ink fill" cx="100" cy="70" r="2" />
        }
        @case ('code') {
          <path class="ink" d="M40 22c-6 0-7 4-7 9v8c0 4-2 6-6 7 4 1 6 3 6 7v8c0 5 1 9 7 9" />
          <path class="ink" d="M80 22c6 0 7 4 7 9v8c0 4 2 6 6 7-4 1-6 3-6 7v8c0 5-1 9-7 9" />
          <path class="gold" d="M64 22L50 48h12l-6 22 16-30H60z" />
          <circle class="coral fill" cx="104" cy="20" r="2.2" />
        }
        @default {
          <path class="gold" d="M60 16l9 19 21 3-15 14 4 21-19-10-19 10 4-21-15-14 21-3z" />
          <path class="coral" d="M98 20v8M94 24h8M22 66v6M19 69h6" />
          <circle class="ink fill" cx="100" cy="72" r="2" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; width: var(--doodle-width, 120px); line-height: 0; }
    svg { width: 100%; height: auto; overflow: visible; }
    .ink { stroke: var(--doodle-ink, #cfc6ea); }
    .gold { stroke: var(--gold); }
    .coral { stroke: var(--coral); }
    .fill { stroke: none; }
    .ink.fill { fill: var(--doodle-ink, #cfc6ea); }
    .gold.fill { fill: var(--gold); }
    .coral.fill { fill: var(--coral); }
  `,
})
export class Doodle {
  readonly name = input.required<DoodleName>();
}

/**
 * A few small dots, sparkles and soft rings scattered over a hero area. Sits behind the content and
 * never takes clicks. Used sparingly: the RSVP hero, the login page, the greeting card and the ticket page.
 */
@Component({
  selector: 'app-sparkle-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (dot of dots; track $index) {
      <i [style.left.%]="dot[0]" [style.top.%]="dot[1]" [style.--s.px]="dot[2]" [class]="dot[3]"></i>
    }
  `,
  styles: `
    :host { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    i { position: absolute; width: var(--s); height: var(--s); border-radius: 50%; background: rgba(233, 228, 255, 0.45); }
    i.gold { background: var(--gold); opacity: 0.8; }
    i.coral { background: var(--coral); opacity: 0.8; }
    i.ring { background: none; border: 1.5px solid rgba(233, 150, 127, 0.55); }
    i.plus { background: none; border-radius: 0; }
    i.plus::before, i.plus::after { content: ''; position: absolute; background: var(--gold); border-radius: 1px; }
    i.plus::before { left: 50%; top: 0; bottom: 0; width: 1.5px; transform: translateX(-50%); }
    i.plus::after { top: 50%; left: 0; right: 0; height: 1.5px; transform: translateY(-50%); }
  `,
})
export class SparkleField {
  /** [left %, top %, size px, style] */
  protected readonly dots: [number, number, number, string][] = [
    // Kept to the edges, so no dot ever sits next to a word and looks like punctuation.
    [3, 18, 3, ''], [5, 70, 2, ''], [22, 4, 2, 'gold'], [7, 96, 3, ''], [48, 3, 2, ''],
    [84, 94, 2, 'coral'], [74, 5, 3, ''], [95, 78, 2, ''], [94, 40, 9, 'plus'], [97, 52, 3, ''],
    [90, 2, 10, 'ring'], [97, 8, 2, 'gold'],
  ];
}
