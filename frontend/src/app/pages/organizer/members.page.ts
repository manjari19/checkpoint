import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api, exportUrls } from '../../core/api';
import { formatDate, formatShortDate, termOf } from '../../core/format';
import { MemberSummary } from '../../core/models';
import { BarChart, ChartSeries } from '../../shared/bar-chart';
import { EmptyState } from '../../shared/empty-state';
import { Toasts } from '../../core/toast';
import { Avatar } from '../../shared/avatar';
import { Icon } from '../../shared/icon';
import { KpiCard } from '../../shared/kpi-card';
import { Skeleton } from '../../shared/skeleton';

/** Attendance rate: events attended out of events they had a seat for that are over. */
export function attendanceRate(member: MemberSummary): number | null {
  const decided = member.attended + member.noShows;
  return decided > 0 ? member.attended / decided : null;
}

@Component({
  selector: 'app-members-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, BarChart, EmptyState, KpiCard, Skeleton, Avatar],
  templateUrl: './members.page.html',
  styleUrl: './members.page.scss',
})
export class MembersPage {
  private readonly api = inject(Api);
  protected readonly toasts = inject(Toasts);

  /** Selected term id like "2027-spring". Starts at the current term. */
  protected readonly term = signal(termOf(new Date()).id);
  protected readonly search = signal('');

  protected readonly summary = rxResource({ params: () => this.term(), stream: ({ params }) => this.api.clubSummary(params) });
  protected readonly members = rxResource({ params: () => this.term(), stream: ({ params }) => this.api.members(params) });

  /** The term picker: terms with events, plus the current term even if it has none yet. */
  protected readonly terms = computed(() => {
    const current = termOf(new Date());
    const list = this.summary.value()?.terms ?? [];
    return list.some((t) => t.id === current.id) ? list : [{ id: current.id, label: current.label }, ...list];
  });

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return (this.members.value() ?? []).filter(
      (m) => !query || m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query));
  });

  protected readonly trendLabels = computed(() => (this.summary.value()?.trend ?? []).map((p) => formatShortDate(p.startsAt)));
  protected readonly trendTitles = computed(() => (this.summary.value()?.trend ?? []).map((p) => p.title));
  protected readonly trendSeries = computed<ChartSeries[]>(() => {
    const trend = this.summary.value()?.trend ?? [];
    return [
      { name: 'Confirmed', color: 'var(--series-1)', values: trend.map((p) => p.confirmed) },
      { name: 'Checked in', color: 'var(--series-2)', values: trend.map((p) => p.checkedIn) },
    ];
  });

  protected readonly csvUrl = computed(() => exportUrls.attendance(this.term()));
  protected readonly formatDate = formatDate;
  protected readonly attendanceRate = attendanceRate;
  protected readonly Math = Math;
}
