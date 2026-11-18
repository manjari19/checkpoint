import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDate, formatTimeRange } from '../core/format';
import { EventCategory, EventSummary, categoryLabel } from '../core/models';
import { DateBlock } from './date-block';
import { Doodle, DoodleName } from './doodle';
import { Icon } from './icon';

/** What the status chip on an event card says. */
export function eventStatus(event: EventSummary, now: Date): { label: string; tone: '' | 'gold' | 'warning' } {
  if (new Date(event.endsAt) <= now) return { label: 'Ended', tone: '' };
  if (new Date(event.startsAt) <= now) return { label: 'Happening now', tone: 'gold' };
  const spotsLeft = event.capacity - event.confirmed;
  if (spotsLeft <= 0) return { label: event.waitlisted > 0 ? `Full · ${event.waitlisted} waiting` : 'Full', tone: 'warning' };
  return { label: 'Open', tone: '' };
}

/** Each category gets its own cover drawing, so a page of cards is easy to scan. */
export const CATEGORY_ART: Record<EventCategory, DoodleName> = {
  NETWORKING: 'people',
  WORKSHOP: 'laptop',
  PANEL: 'mic',
  SOCIAL: 'balloons',
  HACKATHON: 'code',
  OTHER: 'star',
};

/** An event as a poster card: a cover with the date and a drawing, then the title, time and seats. */
@Component({
  selector: 'app-event-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DateBlock, Icon, Doodle],
  template: `
    <a class="card event lift" [routerLink]="['/events', event().id]">
      <div class="cover" [class]="'cover cat-' + event().category.toLowerCase()">
        <app-date-block [iso]="event().startsAt" />
        <span class="chip status" [class.warning]="status().tone === 'warning'" [class.gold]="status().tone === 'gold'">{{ status().label }}</span>
        <app-doodle class="art" [name]="art()" />
      </div>
      <div class="body">
        <span class="eyebrow">{{ category() }}</span>
        <h3>{{ event().title }}</h3>
        <ul class="facts">
          <li><app-icon name="clock" [size]="15" />{{ when() }}</li>
          <li><app-icon name="pin" [size]="15" /><span class="ellipsis">{{ event().location }}</span></li>
        </ul>
        <div class="capacity">
          <div class="meter" role="presentation"><span [style.width.%]="fill()"></span></div>
          <span>{{ spotsText() }}</span>
        </div>
      </div>
    </a>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .event { display: grid; grid-template-rows: auto 1fr; height: 100%; padding: 0; overflow: hidden;
      color: var(--text); text-decoration: none; }
    .event:hover { text-decoration: none; }
    .cover { position: relative; height: 116px; padding: 12px; overflow: hidden;
      background: var(--cover); border-bottom: 1px solid var(--border); }
    .cat-networking { --cover: radial-gradient(90% 120% at 85% 20%, #6a4fe0, transparent 72%), linear-gradient(135deg, #251c4a, #1a1535); }
    .cat-workshop { --cover: radial-gradient(90% 120% at 85% 20%, #1f8a80, transparent 72%), linear-gradient(135deg, #1d2342, #171431); }
    .cat-panel { --cover: radial-gradient(90% 120% at 85% 20%, #9a3f68, transparent 72%), linear-gradient(135deg, #2a1d45, #19142f); }
    .cat-social { --cover: radial-gradient(90% 120% at 85% 20%, #b0663a, transparent 72%), linear-gradient(135deg, #2b1f3d, #1a1530); }
    .cat-hackathon { --cover: radial-gradient(90% 120% at 85% 20%, #3463b8, transparent 72%), linear-gradient(135deg, #1f1d4a, #161331); }
    .cat-other { --cover: radial-gradient(90% 120% at 85% 20%, #6a52b0, transparent 72%), linear-gradient(135deg, #221b40, #18142e); }
    .status { position: absolute; top: 12px; right: 12px; background: rgba(11, 9, 21, 0.6); backdrop-filter: blur(6px); }
    .art { position: absolute; right: 10px; bottom: -6px; --doodle-width: 118px; --doodle-ink: rgba(244, 242, 250, 0.8);
      opacity: 0.95; transition: transform var(--dur-slow) var(--ease); }
    .event:hover .art { transform: translateY(-3px) rotate(-2deg); }
    .body { display: grid; align-content: start; gap: 6px; padding: 14px 16px 16px; }
    h3 { font-size: 1.1rem; overflow-wrap: anywhere; }
    .facts { display: grid; gap: 4px; margin: 2px 0 0; padding: 0; list-style: none; color: var(--muted); font-size: 0.8125rem; }
    .facts li { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .capacity { display: grid; gap: 6px; margin-top: 8px; font-size: 0.78rem; color: var(--muted); }
    .meter { height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
    .meter span { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #7c5cf0, var(--purple-text)); }
  `,
})
export class EventCard {
  readonly event = input.required<EventSummary>();

  protected readonly category = computed(() => categoryLabel(this.event().category));
  protected readonly art = computed(() => CATEGORY_ART[this.event().category] ?? 'star');
  protected readonly status = computed(() => eventStatus(this.event(), new Date()));
  protected readonly when = computed(() =>
    `${formatDate(this.event().startsAt)} · ${formatTimeRange(this.event().startsAt, this.event().endsAt)}`);
  protected readonly fill = computed(() => Math.min(100, (this.event().confirmed / this.event().capacity) * 100));
  protected readonly spotsText = computed(() => {
    const e = this.event();
    const left = Math.max(0, e.capacity - e.confirmed);
    return new Date(e.endsAt) <= new Date()
      ? `${e.checkedIn} of ${e.confirmed} checked in`
      : left === 0
        ? `All ${e.capacity} spots taken`
        : `${left} of ${e.capacity} spots left`;
  });
}
