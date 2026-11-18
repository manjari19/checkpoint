import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonShape = 'kpis' | 'event-cards' | 'rows' | 'chart' | 'panel' | 'ticket' | 'hero';

/**
 * Placeholder shapes shown while data loads, matching the layout of what will replace them, so the
 * page doesn't jump when the content arrives. Hidden from screen readers, which get "Loading" instead.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', '[class]': 'shape()' },
  template: `
    <span class="visually-hidden">Loading</span>
    @switch (shape()) {
      @case ('kpis') {
        @for (i of items(); track i) {
          <div class="card kpi" aria-hidden="true">
            <div class="row"><span class="skel" style="width: 45%; height: 14px"></span><span class="skel" style="width: 28px; height: 28px; border-radius: 9px"></span></div>
            <span class="skel" style="width: 38%; height: 26px; margin-top: 6px"></span>
            <span class="skel" style="width: 62%; height: 11px"></span>
            <span class="skel" style="height: 34px; margin-top: 8px"></span>
          </div>
        }
      }
      @case ('event-cards') {
        @for (i of items(); track i) {
          <div class="card event" aria-hidden="true">
            <span class="skel cover"></span>
            <div class="body">
              <span class="skel" style="width: 30%; height: 10px"></span>
              <span class="skel" style="width: 75%; height: 18px"></span>
              <span class="skel" style="width: 55%; height: 12px"></span>
              <span class="skel" style="height: 6px; margin-top: 10px"></span>
            </div>
          </div>
        }
      }
      @case ('rows') {
        @for (i of items(); track i) {
          <div class="list-row" aria-hidden="true">
            <span class="skel" style="width: 32px; height: 32px; border-radius: 50%"></span>
            <div class="lines"><span class="skel" style="width: 40%; height: 13px"></span><span class="skel" style="width: 60%; height: 10px"></span></div>
            <span class="skel" style="width: 76px; height: 24px; border-radius: 999px"></span>
          </div>
        }
      }
      @case ('chart') {
        <div class="bars" aria-hidden="true">
          @for (h of [40, 65, 50, 80, 58, 90, 70, 84]; track $index) { <span class="skel" [style.height.%]="h"></span> }
        </div>
      }
      @case ('ticket') {
        <div class="ticket" aria-hidden="true">
          <span class="skel" style="height: 210px; border-radius: 18px 18px 6px 6px"></span>
          <span class="skel" style="height: 190px; border-radius: 6px 6px 18px 18px"></span>
        </div>
      }
      @case ('hero') {
        <div class="hero" aria-hidden="true">
          <span class="skel" style="width: 140px; height: 26px; border-radius: 999px"></span>
          <span class="skel" style="width: min(420px, 90%); height: 44px"></span>
          <span class="skel" style="width: min(300px, 70%); height: 14px"></span>
        </div>
      }
      @default {
        <div class="card panel" aria-hidden="true">
          <span class="skel" style="width: 35%; height: 16px"></span>
          <span class="skel" style="height: 12px"></span>
          <span class="skel" style="width: 80%; height: 12px"></span>
          <span class="skel" style="width: 60%; height: 12px"></span>
        </div>
      }
    }
  `,
  styles: `
    :host { display: grid; gap: 14px; }
    :host(.kpis) { grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); }
    :host(.event-cards) { grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    :host(.rows) { gap: 0; }
    .kpi, .panel { display: grid; gap: 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; }
    .event { padding: 0; overflow: hidden; display: grid; }
    .cover { height: 116px; border-radius: 0; }
    .body { display: grid; gap: 8px; padding: 14px 16px 18px; }
    .list-row { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 12px; padding: 10px 0;
      border-top: 1px solid var(--border); }
    .list-row:first-of-type { border-top: 0; }
    .lines { display: grid; gap: 6px; }
    .bars { display: flex; align-items: flex-end; gap: 10px; height: 180px; padding: 10px 6px 24px 34px; }
    .bars .skel { flex: 1; border-radius: 6px 6px 2px 2px; }
    .ticket { display: grid; gap: 4px; width: min(400px, 100%); margin: 0 auto; }
    .hero { display: grid; justify-items: center; gap: 16px; padding: 48px 0 28px; }
  `,
})
export class Skeleton {
  readonly shape = input.required<SkeletonShape>();
  readonly count = input(4);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
