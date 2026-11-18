import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage, exportUrls } from '../../core/api';
import { formatDateTime, formatLongDate, formatPercent, formatTime, formatTimeRange } from '../../core/format';
import { AttendeeRow, RsvpStatus, categoryLabel } from '../../core/models';
import { Toasts } from '../../core/toast';
import { Avatar } from '../../shared/avatar';
import { BarChart, ChartSeries } from '../../shared/bar-chart';
import { CopyButton } from '../../shared/copy-button';
import { DateBlock } from '../../shared/date-block';
import { EmptyState } from '../../shared/empty-state';
import { eventStatus } from '../../shared/event-card';
import { Icon } from '../../shared/icon';
import { KpiCard } from '../../shared/kpi-card';
import { Sheet } from '../../shared/sheet';
import { Skeleton } from '../../shared/skeleton';

type Filter = 'all' | RsvpStatus;

/** Keeps rows whose name or email contains the search text, in the chosen status. */
export function filterAttendees(rows: AttendeeRow[], filter: Filter, search: string): AttendeeRow[] {
  const query = search.trim().toLowerCase();
  return rows.filter((row) =>
    (filter === 'all' || row.status === filter)
    && (!query || row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query)));
}

@Component({
  selector: 'app-event-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, DateBlock, BarChart, EmptyState, CopyButton, KpiCard, Skeleton, Avatar, Sheet],
  templateUrl: './event-dashboard.page.html',
  styleUrl: './event-dashboard.page.scss',
})
export class EventDashboardPage {
  readonly eventId = input.required<string>();

  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly event = rxResource({ params: () => this.eventId(), stream: ({ params }) => this.api.event(params) });
  protected readonly stats = rxResource({ params: () => this.eventId(), stream: ({ params }) => this.api.stats(params) });
  protected readonly attendees = rxResource({ params: () => this.eventId(), stream: ({ params }) => this.api.attendees(params) });

  protected readonly filter = signal<Filter>('all');
  protected readonly search = signal('');
  protected readonly checkingIn = signal<string | null>(null);
  protected readonly sponsorName = signal('');
  protected readonly actionError = signal('');
  /** Phones: the sheet with the event's other actions. */
  protected readonly actionsOpen = signal(false);
  /** The sponsor waiting for "are you sure?" before being removed. */
  protected readonly removing = signal<{ id: string; name: string } | null>(null);

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'WAITLISTED', label: 'Waitlist' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  protected readonly rows = computed(() => filterAttendees(this.attendees.value() ?? [], this.filter(), this.search()));
  protected readonly counts = computed(() => {
    const rows = this.attendees.value() ?? [];
    const count = (status: RsvpStatus) => rows.filter((r) => r.status === status).length;
    return { all: rows.length, CONFIRMED: count('CONFIRMED'), WAITLISTED: count('WAITLISTED'), CANCELLED: count('CANCELLED') };
  });

  protected readonly status = computed(() => {
    const e = this.event.value();
    return e ? eventStatus(e, new Date()) : null;
  });

  protected readonly rsvpLink = computed(() => `${location.origin}/e/${this.eventId()}`);
  protected readonly timelineLabels = computed(() => (this.stats.value()?.timeline ?? []).map((p) => formatTime(p.bucketStart)));
  protected readonly timelineSeries = computed<ChartSeries[]>(() => [
    { name: 'Check-ins', color: 'var(--series-1)', values: (this.stats.value()?.timeline ?? []).map((p) => p.checkIns) },
  ]);

  /** Running total of check-ins, for the sparkline on the "Checked in" card. */
  protected readonly cumulative = computed(() => (this.stats.value()?.timeline ?? []).map((p) => p.cumulative));

  protected readonly exportUrls = exportUrls;
  protected readonly formatLongDate = formatLongDate;
  protected readonly formatTimeRange = formatTimeRange;
  protected readonly formatTime = formatTime;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatPercent = formatPercent;
  protected readonly categoryLabel = categoryLabel;

  protected exported(what: string): void {
    this.toasts.show(`Exporting ${what} as CSV`, 'info');
  }

  protected boothLink(code: string): string {
    return `${location.origin}/booth/${code}`;
  }

  protected async checkIn(row: AttendeeRow): Promise<void> {
    this.checkingIn.set(row.rsvpId);
    this.actionError.set('');
    try {
      await firstValueFrom(this.api.checkInManually(this.eventId(), row.rsvpId));
      this.toasts.show(`${row.name} checked in`);
      this.attendees.reload();
      this.stats.reload();
    } catch (e) {
      this.actionError.set(errorMessage(e));
    } finally {
      this.checkingIn.set(null);
    }
  }

  protected async addSponsor(): Promise<void> {
    const name = this.sponsorName().trim();
    if (!name) return;
    this.actionError.set('');
    try {
      await firstValueFrom(this.api.addSponsor(this.eventId(), name));
      this.sponsorName.set('');
      this.event.reload();
      this.toasts.show(`${name} added. Send them their booth link.`);
    } catch (e) {
      this.actionError.set(errorMessage(e));
    }
  }

  protected async copyRsvpLink(): Promise<void> {
    this.actionsOpen.set(false);
    try {
      await navigator.clipboard.writeText(this.rsvpLink());
      this.toasts.show('RSVP link copied');
    } catch {
      window.prompt('Copy this link:', this.rsvpLink());
    }
  }

  protected async removeSponsor(sponsorId: string, name: string): Promise<void> {
    this.removing.set(null);
    this.actionError.set('');
    try {
      await firstValueFrom(this.api.removeSponsor(this.eventId(), sponsorId));
      this.event.reload();
      this.toasts.show(`${name} removed`, 'info');
    } catch (e) {
      this.actionError.set(errorMessage(e));
    }
  }
}
