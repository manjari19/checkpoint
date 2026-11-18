import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api, exportUrls } from '../../core/api';
import { formatDate } from '../../core/format';
import { CopyButton } from '../../shared/copy-button';
import { EmptyState } from '../../shared/empty-state';
import { Toasts } from '../../core/toast';
import { Icon } from '../../shared/icon';
import { Skeleton } from '../../shared/skeleton';

@Component({
  selector: 'app-sponsors-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, CopyButton, EmptyState, Skeleton],
  template: `
    <header class="page-header">
      <div>
        <h1>Sponsors</h1>
        <p>Send each sponsor their booth link. They scan tickets of attendees who agreed to share their contact.</p>
      </div>
    </header>

    @if (sponsors.isLoading()) {
      <app-skeleton shape="event-cards" [count]="3" />
    } @else if ((sponsors.value() ?? []).length === 0) {
      <div class="card empty">
        <app-empty-state title="No sponsors yet" message="Add sponsors when you create an event, or from an event's page."
                         art="gift" actionLabel="Go to events" link="/events" />
      </div>
    } @else {
      <div class="grid">
        @for (s of sponsors.value(); track s.id; let i = $index) {
          <article class="card sponsor lift" animate.enter="rise" [style.--i]="i">
            <div class="top">
              <span class="badge" aria-hidden="true">{{ s.name.charAt(0) }}</span>
              <div class="name">
                <h3>{{ s.name }}</h3>
                <a [routerLink]="['/events', s.eventId]">{{ s.eventTitle }}</a>
                <span class="muted">{{ formatDate(s.eventStartsAt) }}</span>
              </div>
            </div>
            <p class="leads"><strong>{{ s.leadCount }}</strong> {{ s.leadCount === 1 ? 'contact' : 'contacts' }} collected</p>
            <div class="actions">
              <app-copy-button [text]="boothLink(s.boothCode)" label="Copy booth link" [ariaLabel]="'Copy booth link for ' + s.name" />
              <a class="btn btn-small" [href]="exportUrls.sponsorContacts(s.eventId)" download
                 (click)="toasts.show('Exporting sponsor contacts as CSV', 'info')"><app-icon name="download" [size]="15" />Event contacts</a>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; }
    .sponsor { display: grid; gap: 14px; }
    .top { display: flex; gap: 14px; min-width: 0; }
    .badge { display: grid; place-items: center; width: 44px; height: 44px; flex: none; border-radius: 14px;
      background: var(--purple-soft); box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.35); color: var(--purple-text);
      font-family: var(--font-serif); font-weight: 600; font-size: 1.25rem; }
    .empty { max-width: 560px; }
    .name { display: grid; gap: 2px; min-width: 0; font-size: 0.875rem; }
    .name h3 { font-size: 1.05rem; overflow-wrap: anywhere; }
    .name a { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .leads { color: var(--muted); }
    .leads strong { color: var(--text); font-family: var(--font-serif); font-size: 1.5rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  `,
})
export class SponsorsPage {
  private readonly api = inject(Api);
  protected readonly toasts = inject(Toasts);
  protected readonly sponsors = rxResource({ stream: () => this.api.sponsors() });
  protected readonly exportUrls = exportUrls;
  protected readonly formatDate = formatDate;

  protected boothLink(code: string): string {
    return `${location.origin}/booth/${code}`;
  }
}
