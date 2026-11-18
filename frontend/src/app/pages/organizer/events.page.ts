import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { prefersReducedMotion } from '../../core/motion';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { EVENT_CATEGORIES, EventCategory } from '../../core/models';
import { EmptyState } from '../../shared/empty-state';
import { EventCard } from '../../shared/event-card';
import { Icon } from '../../shared/icon';
import { Skeleton } from '../../shared/skeleton';

type Tab = 'upcoming' | 'past';

@Component({
  selector: 'app-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, EventCard, EmptyState, Skeleton],
  template: `
    <header class="head">
      <div class="title-row">
        <h1>Events</h1>
        <a class="btn btn-primary new" routerLink="/events/new"><app-icon name="plus" [size]="17" />New event</a>
      </div>
      <p>Create events, share the RSVP link, and run check-in on the night.</p>
    </header>

    <div class="filters">
      <div class="segmented" role="tablist" aria-label="Which events">
        <button type="button" role="tab" [class.active]="tab() === 'upcoming'" [attr.aria-selected]="tab() === 'upcoming'"
                (click)="tab.set('upcoming')">Upcoming {{ upcoming().length }}</button>
        <button type="button" role="tab" [class.active]="tab() === 'past'" [attr.aria-selected]="tab() === 'past'"
                (click)="tab.set('past')">Past {{ past().length }}</button>
      </div>
      <div class="categories" role="group" aria-label="Filter by category">
        <button type="button" class="cat" [class.on]="category() === null" [attr.aria-pressed]="category() === null"
                (click)="category.set(null)">All</button>
        @for (c of usedCategories(); track c.value) {
          <button type="button" class="cat" [class.on]="category() === c.value" [attr.aria-pressed]="category() === c.value"
                  (click)="category.set(category() === c.value ? null : c.value)">{{ c.label }}</button>
        }
      </div>
    </div>

    @if (events.isLoading()) {
      <app-skeleton shape="event-cards" [count]="6" />
    } @else if (events.error()) {
      <p class="alert" role="alert">Couldn't load your events. Refresh the page to try again.</p>
    } @else if (shown().length === 0) {
      <div class="card empty">
        @if (category() !== null) {
          <app-empty-state title="No events in this category" message="Try another category, or show them all."
                           art="search" actionLabel="Show all" (action)="category.set(null)" />
        } @else if (tab() === 'upcoming') {
          <app-empty-state title="No upcoming events" message="Create your next event, then share its RSVP link with your members."
                           art="calendar" actionLabel="Create an event" link="/events/new" />
        } @else {
          <app-empty-state title="No past events yet" message="Events move here once they're over, with their attendance numbers." art="door" />
        }
      </div>
    } @else {
      <!-- A grid on wide screens; on phones a swipeable carousel with the next card peeking in. -->
      <div class="grid" #track (scroll)="onScroll()" aria-roledescription="carousel" aria-label="Events">
        @for (event of shown(); track event.id; let i = $index) {
          <app-event-card [event]="event" animate.enter="rise" [style.--i]="i"
                          [class.before]="i < active()" [class.after]="i > active()" />
        }
      </div>
      @if (shown().length > 1) {
        <div class="pager">
          <div class="dots">
            @for (event of shown(); track event.id; let i = $index) {
              <button type="button" class="dot" [class.on]="i === active()" (click)="goTo(i)"
                      [attr.aria-label]="'Show ' + event.title + ', ' + (i + 1) + ' of ' + shown().length"
                      [attr.aria-current]="i === active() ? 'true' : null"></button>
            }
          </div>
          <button type="button" class="btn-round" (click)="goTo((active() + 1) % shown().length)"
                  [attr.aria-label]="active() === shown().length - 1 ? 'Back to the first event' : 'Next event'">
            <app-icon name="arrow-right" [size]="18" />
          </button>
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin-bottom: 18px; }
    .categories { display: flex; gap: 6px; overflow-x: auto; max-width: 100%; padding: 2px; scrollbar-width: none; }
    .cat { flex: none; min-height: 32px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border-strong);
      background: transparent; color: var(--muted); font: inherit; font-size: 0.8125rem; font-weight: 600; cursor: pointer;
      transition: background-color var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    .cat:hover { color: var(--text); border-color: rgba(255, 255, 255, 0.26); }
    .cat.on { background: var(--purple-soft); border-color: rgba(139, 92, 246, 0.5); color: var(--purple-text); }
    .head { margin-bottom: 18px; }
    .title-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .head p { margin-top: 4px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    .pager { display: none; }
    .empty { max-width: 560px; }

    // Phones: one card at a time, swiped sideways, snapping into place. Cards either side shrink a little
    // and fan out, like a stack of cards.
    @media (max-width: 640px) {
      .head { margin-bottom: 14px; }
      .head h1 { font-size: 1.55rem; }
      .head p { font-size: 0.8125rem; }
      .head .new { min-height: 38px; padding: 0 14px; }
      .grid {
        display: flex; gap: 12px; margin: 0 -16px; padding: 6px 44px 20px; overflow-x: auto;
        scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none;
      }
      .grid::-webkit-scrollbar { display: none; }
      .grid app-event-card {
        flex: 0 0 calc(100vw - 88px); scroll-snap-align: center; transform-origin: 50% 100%;
        transition: transform 340ms var(--spring), opacity 250ms ease;
      }
      .grid app-event-card.before { transform: scale(0.92) rotate(-2deg); opacity: 0.75; }
      .grid app-event-card.after { transform: scale(0.92) rotate(2deg); opacity: 0.75; }
      .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 2px; }
      .dots { display: flex; gap: 6px; flex-wrap: wrap; }
      .dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 4px; background: rgba(255, 255, 255, 0.22);
        cursor: pointer; transition: width 300ms var(--spring), background-color 200ms; }
      .dot.on { width: 24px; background: var(--purple-text); }
      // Bigger invisible tap target around each small dot.
      .dot { position: relative; }
      .dot::after { content: ''; position: absolute; inset: -10px -4px; }
    }
  `,
})
export class EventsPage {
  private readonly api = inject(Api);

  protected readonly tab = signal<Tab>('upcoming');
  protected readonly category = signal<EventCategory | null>(null);
  protected readonly events = rxResource({ stream: () => this.api.events() });

  /** Soonest first. */
  protected readonly upcoming = computed(() =>
    (this.events.value() ?? [])
      .filter((e) => new Date(e.endsAt) > new Date())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  /** Most recent first (the API's order). */
  protected readonly past = computed(() => (this.events.value() ?? []).filter((e) => new Date(e.endsAt) <= new Date()));

  /** Only offer categories the club actually uses. */
  protected readonly usedCategories = computed(() => {
    const used = new Set((this.events.value() ?? []).map((e) => e.category));
    return EVENT_CATEGORIES.filter((c) => used.has(c.value));
  });

  protected readonly shown = computed(() => {
    const list = this.tab() === 'upcoming' ? this.upcoming() : this.past();
    const category = this.category();
    return category === null ? list : list.filter((e) => e.category === category);
  });

  /** On phones, the card in the middle of the carousel. */
  protected readonly active = signal(0);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  constructor() {
    // A new tab or category starts the carousel from the first card again.
    effect(() => {
      this.shown();
      untracked(() => {
        this.active.set(0);
        this.track()?.nativeElement.scrollTo({ left: 0 });
      });
    });
  }

  protected onScroll(): void {
    const track = this.track()?.nativeElement;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !first) return;
    this.active.set(carouselIndex(track.scrollLeft, first.offsetWidth, 12, track.children.length));
  }

  protected goTo(index: number): void {
    const track = this.track()?.nativeElement;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }
}

/** Which card is centered in a snap carousel, given how far it has scrolled. */
export function carouselIndex(scrollLeft: number, cardWidth: number, gap: number, count: number): number {
  if (count === 0 || cardWidth <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / (cardWidth + gap))));
}
