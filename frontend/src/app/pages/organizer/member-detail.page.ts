import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { formatDate, formatTime } from '../../core/format';
import { HistoryOutcome } from '../../core/models';
import { EmptyState } from '../../shared/empty-state';
import { Toasts } from '../../core/toast';
import { Avatar } from '../../shared/avatar';
import { Icon } from '../../shared/icon';
import { KpiCard } from '../../shared/kpi-card';
import { Skeleton } from '../../shared/skeleton';

const OUTCOMES: Record<HistoryOutcome, { label: string; tone: string }> = {
  ATTENDED: { label: 'Attended', tone: 'success' },
  NO_SHOW: { label: 'No-show', tone: 'danger' },
  UPCOMING: { label: 'Upcoming', tone: 'purple' },
  WAITLISTED: { label: 'Stayed on waitlist', tone: '' },
  CANCELLED: { label: 'Cancelled', tone: '' },
};

@Component({
  selector: 'app-member-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, EmptyState, KpiCard, Skeleton, Avatar],
  template: `
    <a class="back" routerLink="/members"><app-icon name="arrow-left" [size]="16" />All members</a>

    @if (member.error()) {
      <div class="card"><app-empty-state title="Member not found" art="search" actionLabel="Back to members" link="/members" /></div>
    } @else if (member.value(); as m) {
      <header class="page-header">
        <div class="who">
          <app-avatar [name]="m.name" [size]="52" />
          <div>
            <h1>{{ m.name }}</h1>
            <p>{{ m.email }}</p>
          </div>
        </div>
        @if (m.cardLinked) {
          <button type="button" class="btn btn-danger" (click)="unlink()"><app-icon name="card" [size]="16" />Unlink student card</button>
        }
      </header>
      @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }

      <section class="kpis">
        <app-kpi-card animate.enter="rise" style="--i: 0" label="Attended" [value]="m.attended" icon="user-check" tint="green" />
        <app-kpi-card animate.enter="rise" style="--i: 1" label="No-shows" [value]="m.noShows" icon="user-x" tint="amber" />
        <div class="card kpi-card-like" animate.enter="rise" style="--i: 2">
          <span class="label">Student card</span>
          <strong>{{ m.cardLinked ? 'Linked' : 'Not linked' }}</strong>
          <span class="muted note">{{ m.cardLinked ? 'Only a hash is stored' : 'Can be linked on their next RSVP' }}</span>
        </div>
      </section>

      <section class="card" animate.enter="rise" style="--i: 3">
        <h2>Event history</h2>
        <ul class="history">
          @for (h of m.events; track h.eventId) {
            <li>
              <a [routerLink]="['/events', h.eventId]" class="ev">
                <strong>{{ h.eventTitle }}</strong>
                <span>{{ formatDate(h.eventStartsAt) }}@if (h.checkedInAt) { · in at {{ formatTime(h.checkedInAt) }} }</span>
              </a>
              <span class="chip" [class]="'chip ' + outcomes[h.outcome].tone">{{ outcomes[h.outcome].label }}</span>
            </li>
          }
        </ul>
      </section>
    } @else {
      <app-skeleton shape="kpis" [count]="3" />
      <app-skeleton shape="panel" />
    }
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .who { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .who > div { min-width: 0; }
    .page-header { margin-bottom: 0; }
    .page-header h1 { overflow-wrap: anywhere; }
    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .kpi-card-like { display: grid; align-content: start; gap: 6px; }
    .kpi-card-like .label { font-family: var(--font-serif); font-size: 0.95rem; }
    .kpi-card-like strong { font-size: 1.25rem; padding-top: 6px; }
    .note { font-size: 0.75rem; }
    .history { margin: 12px 0 0; padding: 0; list-style: none; }
    .history li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--border); }
    .history li:first-child { border-top: 0; }
    .ev { display: grid; min-width: 0; color: var(--text); }
    .ev strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ev span { font-size: 0.8125rem; color: var(--muted); }
    @media (max-width: 560px) {
      .kpis { grid-template-columns: 1fr 1fr; gap: 10px; }
      .kpi-card-like { grid-column: 1 / -1; }
    }
  `,
})
export class MemberDetailPage {
  readonly memberId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly member = rxResource({ params: () => this.memberId(), stream: ({ params }) => this.api.member(params) });
  protected readonly error = signal('');
  protected readonly outcomes = OUTCOMES;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;

  protected async unlink(): Promise<void> {
    if (!confirm('Unlink this student card? The member can link a card again on their next RSVP.')) return;
    try {
      await firstValueFrom(this.api.unlinkCard(this.memberId()));
      this.member.reload();
      this.toasts.show('Student card unlinked');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
