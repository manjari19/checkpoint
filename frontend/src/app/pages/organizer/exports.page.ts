import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Api, exportUrls } from '../../core/api';
import { formatDate, termOf } from '../../core/format';
import { Toasts } from '../../core/toast';
import { Icon } from '../../shared/icon';

/** Every CSV download in one place. */
@Component({
  selector: 'app-exports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <header class="page-header">
      <div>
        <h1>Exports</h1>
        <p>CSV files open in Excel, Numbers and Google Sheets.</p>
      </div>
    </header>

    <div class="grid">
      <section class="card export lift" animate.enter="rise">
        <span class="icon-chip purple"><app-icon name="users" [size]="20" /></span>
        <h2>Member attendance</h2>
        <p class="muted">One row per member: RSVPs, events attended, no-shows and last visit. Good for funding requests.</p>
        <label class="field">
          <span>Term</span>
          <select class="input" [value]="term()" (change)="term.set($any($event.target).value)">
            <option value="">All time</option>
            @for (t of terms(); track t.id) {
              <option [value]="t.id" [selected]="t.id === term()">{{ t.label }}</option>
            }
          </select>
        </label>
        <a class="btn btn-soft" [href]="attendanceUrl()" download (click)="toasts.show('Exporting member attendance as CSV', 'info')">
          <app-icon name="download" [size]="16" />Download CSV
        </a>
      </section>

      <section class="card export lift" animate.enter="rise" style="--i: 1">
        <span class="icon-chip green"><app-icon name="list" [size]="20" /></span>
        <h2>Event attendee list</h2>
        <p class="muted">Everyone who RSVP'd to one event, with their status and check-in time.</p>
        <label class="field">
          <span>Event</span>
          <select class="input" [value]="eventId()" (change)="eventId.set($any($event.target).value)" [disabled]="eventOptions().length === 0">
            @for (e of eventOptions(); track e.id) {
              <option [value]="e.id" [selected]="e.id === eventId()">{{ e.label }}</option>
            } @empty {
              <option value="">No events yet</option>
            }
          </select>
        </label>
        <div class="pair">
          <a class="btn btn-soft" [href]="eventId() ? exportUrls.attendees(eventId()) : null" download
             [class.disabled]="!eventId()" (click)="toasts.show('Exporting the attendee list as CSV', 'info')"><app-icon name="download" [size]="16" />Attendees</a>
          <a class="btn" [href]="eventId() ? exportUrls.sponsorContacts(eventId()) : null" download
             [class.disabled]="!eventId()" (click)="toasts.show('Exporting sponsor contacts as CSV', 'info')"><app-icon name="download" [size]="16" />Sponsor contacts</a>
        </div>
      </section>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 16px; }
    .export { display: grid; gap: 14px; align-content: start; }
    .icon-chip { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; }
    .icon-chip.purple { color: var(--purple-text); background: var(--purple-soft); box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.35); }
    .icon-chip.green { color: var(--success); background: rgba(52, 211, 153, 0.12); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.3); }
    select.input { border-radius: 999px; }
    .pair { display: flex; flex-wrap: wrap; gap: 10px; }
    .pair .btn { flex: 1 1 auto; }
    .disabled { pointer-events: none; opacity: 0.5; }
  `,
})
export class ExportsPage {
  private readonly api = inject(Api);
  protected readonly toasts = inject(Toasts);
  private readonly events = rxResource({ stream: () => this.api.events() });
  private readonly summary = rxResource({ stream: () => this.api.clubSummary() });

  protected readonly term = signal(termOf(new Date()).id);
  protected readonly terms = computed(() => this.summary.value()?.terms ?? []);
  protected readonly eventOptions = computed(() =>
    (this.events.value() ?? []).map((e) => ({ id: e.id, label: `${e.title} · ${formatDate(e.startsAt)}` })));
  protected readonly eventId = linkedSignal(() => this.eventOptions()[0]?.id ?? '');

  protected readonly attendanceUrl = computed(() => exportUrls.attendance(this.term() || undefined));
  protected readonly exportUrls = exportUrls;
}
