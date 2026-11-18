import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { formatDateTime } from '../../core/format';
import { EventSummary } from '../../core/models';
import { BarcodeScanner, ScanMode } from '../../shared/barcode-scanner';
import { CountUp } from '../../shared/count-up';
import { Icon } from '../../shared/icon';
import { ResultCard, describeCheckIn } from './check-in-result';

/** How long a result stays up before the scanner is ready for the next person. */
export const RESULT_MS = { success: 2000, warning: 3000, danger: 3000 } as const;

/**
 * Picks the event to check people in to when none is given: one happening now, otherwise the next
 * upcoming one, otherwise the most recent.
 */
export function defaultCheckInEvent(events: EventSummary[], now: Date): EventSummary | null {
  const byStart = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    byStart.find((e) => new Date(e.startsAt) <= now && new Date(e.endsAt) > now)
    ?? byStart.find((e) => new Date(e.startsAt) > now)
    ?? byStart.at(-1)
    ?? null
  );
}

/** Full-screen door scanner for organizers: ticket QR codes or student card barcodes. */
@Component({
  selector: 'app-check-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, Icon, BarcodeScanner, CountUp],
  templateUrl: './check-in.page.html',
  styleUrl: './check-in.page.scss',
})
export class CheckInPage {
  /** From /events/:eventId/check-in. On /check-in it is empty and an event is picked automatically. */
  readonly eventId = input<string>();

  private readonly api = inject(Api);

  protected readonly events = rxResource({ stream: () => this.api.events() });
  /** The event being checked in to; starts from the URL or the automatic pick, and can be switched. */
  protected readonly selectedId = linkedSignal(
    () => this.eventId() ?? defaultCheckInEvent(this.events.value() ?? [], new Date())?.id ?? null,
  );
  protected readonly selected = computed(() => (this.events.value() ?? []).find((e) => e.id === this.selectedId()) ?? null);
  protected readonly stats = rxResource({
    params: () => this.selectedId(),
    stream: ({ params }) => (params ? this.api.stats(params) : of(null)),
  });

  protected readonly mode = signal<ScanMode>('qr');
  protected readonly busy = signal(false);
  /** The current result card. Each scan gets a new id, so the card animates in again for the next person. */
  protected readonly result = signal<(ResultCard & { id: number; resetMs: number }) | null>(null);
  protected readonly results = computed(() => {
    const r = this.result();
    return r ? [r] : [];
  });
  protected readonly manualCode = signal('');
  protected readonly showManual = signal(false);

  protected readonly formatDateTime = formatDateTime;

  private scans = 0;
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.resetTimer));
  }

  protected async onScan(code: string): Promise<void> {
    const eventId = this.selectedId();
    if (!eventId || this.busy() || !code.trim()) return;
    this.busy.set(true);
    try {
      const response = await firstValueFrom(
        this.mode() === 'qr' ? this.api.checkInByTicket(eventId, code) : this.api.checkInByCard(eventId, code),
      );
      const card = describeCheckIn(response);
      this.show(card);
      // A short buzz for a welcome; a double buzz when something needs the organizer's attention.
      navigator.vibrate?.(card.tone === 'success' ? 80 : [70, 60, 70]);
      this.stats.reload();
    } catch (e) {
      this.show({ tone: 'danger', icon: 'x', title: 'Couldn’t check in', detail: errorMessage(e) });
    } finally {
      this.busy.set(false);
    }
  }

  /** Shows a result, then clears it automatically so the scanner is ready for the next person. */
  private show(card: ResultCard): void {
    clearTimeout(this.resetTimer);
    const resetMs = RESULT_MS[card.tone];
    this.result.set({ ...card, id: ++this.scans, resetMs });
    this.resetTimer = setTimeout(() => this.result.set(null), resetMs);
  }

  protected async submitManual(): Promise<void> {
    await this.onScan(this.manualCode());
    this.manualCode.set('');
  }

  protected switchMode(mode: ScanMode): void {
    this.mode.set(mode);
    clearTimeout(this.resetTimer);
    this.result.set(null);
  }
}
