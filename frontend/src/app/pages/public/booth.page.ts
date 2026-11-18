import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { formatLongDate, formatTime } from '../../core/format';
import { BoothScanResult } from '../../core/models';
import { BarcodeScanner } from '../../shared/barcode-scanner';
import { Avatar } from '../../shared/avatar';
import { Icon } from '../../shared/icon';
import { Skeleton } from '../../shared/skeleton';

export interface BoothCard {
  tone: 'success' | 'warning' | 'danger';
  icon: string;
  title: string;
  detail: string;
}

/** What the result card says after a sponsor scans a ticket. */
export function describeBoothScan(result: BoothScanResult): BoothCard {
  switch (result.outcome) {
    case 'SAVED':
      return { tone: 'success', icon: 'check', title: `Saved ${result.lead?.name}`, detail: result.lead?.email ?? '' };
    case 'ALREADY_SAVED':
      return { tone: 'warning', icon: 'check', title: 'Already saved', detail: `${result.lead?.name} · ${result.lead?.email}` };
    case 'NOT_OPTED_IN':
      return { tone: 'danger', icon: 'x', title: 'Not shared', detail: 'This attendee chose not to share their contact with sponsors.' };
    default:
      return { tone: 'danger', icon: 'x', title: 'Not a ticket for this event', detail: result.message };
  }
}

/** Sponsor booth mode (/booth/:code): scan attendee QR codes to collect contacts of people who opted in. */
@Component({
  selector: 'app-booth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Icon, BarcodeScanner, Avatar, Skeleton],
  templateUrl: './booth.page.html',
  styleUrl: './booth.page.scss',
})
export class BoothPage {
  readonly code = input.required<string>();

  private readonly api = inject(Api);

  protected readonly booth = rxResource({ params: () => this.code(), stream: ({ params }) => this.api.booth(params) });
  protected readonly busy = signal(false);
  /** The latest result. Each scan gets a new id, so the card pops in again for the next ticket. */
  protected readonly result = signal<(BoothCard & { id: number }) | null>(null);
  protected readonly results = computed(() => {
    const r = this.result();
    return r ? [r] : [];
  });
  private scans = 0;
  protected readonly manualCode = signal('');

  protected readonly formatLongDate = formatLongDate;
  protected readonly formatTime = formatTime;

  protected async onScan(ticketCode: string): Promise<void> {
    if (this.busy() || !ticketCode.trim()) return;
    this.busy.set(true);
    try {
      const response = await firstValueFrom(this.api.boothScan(this.code(), ticketCode.trim()));
      this.result.set({ ...describeBoothScan(response), id: ++this.scans });
      navigator.vibrate?.(response.outcome === 'SAVED' ? 80 : [70, 60, 70]);
      if (response.outcome === 'SAVED') {
        this.booth.reload();
      }
    } catch (e) {
      this.result.set({ tone: 'danger', icon: 'x', title: 'Couldn’t save', detail: errorMessage(e), id: ++this.scans });
    } finally {
      this.busy.set(false);
      this.manualCode.set('');
    }
  }
}
