import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    <header class="page-header">
      <div>
        <h1>Events</h1>
        <p>Create events, share the RSVP link, and run check-in on the night.</p>
      </div>
      <a class="btn btn-primary" routerLink="/events/new"><app-icon name="plus" [size]="17" />New event</a>
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
      <div class="grid">
        @for (event of shown(); track event.id; let i = $index) {
          <app-event-card [event]="event" animate.enter="rise" [style.--i]="i" />
        }
      </div>
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
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    .empty { max-width: 560px; }
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
}
