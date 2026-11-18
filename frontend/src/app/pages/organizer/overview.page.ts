import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { firstName, formatDate, formatLongDate, formatPercent, formatShortDate, formatTimeRange, greeting } from '../../core/format';
import { categoryLabel } from '../../core/models';
import { AvatarStack } from '../../shared/avatar';
import { ChartSeries } from '../../shared/bar-chart';
import { CountUp } from '../../shared/count-up';
import { DateBlock } from '../../shared/date-block';
import { SparkleField } from '../../shared/doodle';
import { EmptyState } from '../../shared/empty-state';
import { Icon } from '../../shared/icon';
import { KpiCard, KpiChange, KpiTint } from '../../shared/kpi-card';
import { LineChart } from '../../shared/line-chart';
import { Skeleton } from '../../shared/skeleton';
import { changeVsAverage, overviewStats, pointsVsAverage } from './overview-stats';

interface Kpi {
  label: string;
  value: number | null;
  format: 'number' | 'percent';
  icon: string;
  tint: KpiTint;
  change: KpiChange | null;
  note: string;
  spark: number[];
}

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, KpiCard, LineChart, EmptyState, Skeleton, AvatarStack, CountUp, DateBlock, SparkleField],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
})
export class OverviewPage {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);

  protected readonly events = rxResource({ stream: () => this.api.events() });
  protected readonly stats = computed(() => overviewStats(this.events.value() ?? [], new Date()));

  /** Who's coming to the next event, for the row of avatars on the greeting card. */
  private readonly nextAttendees = rxResource({
    params: () => this.stats().nextEvent?.id ?? null,
    stream: ({ params }) => (params ? this.api.attendees(params) : of([])),
  });
  protected readonly comingNames = computed(() =>
    (this.nextAttendees.value() ?? []).filter((a) => a.status === 'CONFIRMED').map((a) => a.name));

  protected readonly greetingText = computed(() => greeting(new Date().getHours()));
  protected readonly name = computed(() => firstName(this.auth.organizer()?.displayName));

  protected readonly kpis = computed<Kpi[]>(() => {
    const s = this.stats();
    return [
      { label: 'RSVPs', value: s.rsvps, format: 'number', icon: 'ticket', tint: 'purple',
        change: changeVsAverage(s.spark.rsvps), note: '', spark: s.spark.rsvps },
      { label: 'Checked in', value: s.checkedIn, format: 'number', icon: 'user-check', tint: 'green',
        change: changeVsAverage(s.spark.checkedIn), note: '', spark: s.spark.checkedIn },
      { label: 'On waitlists', value: s.waitlisted, format: 'number', icon: 'hourglass', tint: 'blue', change: null,
        note: `Across ${s.upcomingCount} upcoming ${s.upcomingCount === 1 ? 'event' : 'events'}`, spark: s.spark.waitlisted },
      { label: 'No-show rate', value: s.noShowRate, format: 'percent', icon: 'user-x', tint: 'amber',
        change: pointsVsAverage(s.spark.noShowRate, false), note: s.noShowRate === null ? 'After your first event ends' : '',
        spark: s.spark.noShowRate },
    ];
  });

  protected readonly trendSeries = computed<ChartSeries[]>(() => [
    { name: 'Confirmed', color: 'var(--series-1)', values: this.stats().trend.map((e) => e.confirmed) },
    { name: 'Checked in', color: 'var(--series-2)', values: this.stats().trend.map((e) => e.checkedIn) },
  ]);
  protected readonly trendLabels = computed(() => this.stats().trend.map((e) => formatShortDate(e.startsAt)));
  protected readonly trendTitles = computed(() => this.stats().trend.map((e) => `${e.title} · ${formatDate(e.startsAt)}`));

  protected readonly formatLongDate = formatLongDate;
  protected readonly formatTimeRange = formatTimeRange;
  protected readonly formatPercent = formatPercent;
  protected readonly formatDate = formatDate;
  protected readonly categoryLabel = categoryLabel;
  protected readonly Math = Math;
}
