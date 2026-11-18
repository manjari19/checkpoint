import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage } from '../../core/api';
import { formatDate, formatTime, formatTimeRange } from '../../core/format';
import { prefersReducedMotion } from '../../core/motion';
import { AccentTitle } from '../../shared/accent-title';
import { CountUp } from '../../shared/count-up';
import { Doodle } from '../../shared/doodle';
import { Icon } from '../../shared/icon';
import { QrCode } from '../../shared/qr-code';
import { Skeleton } from '../../shared/skeleton';

/** How often an open ticket page checks for news (checked in at the door, or moved up the waitlist). */
const REFRESH_MS = 15000;
/** The most the ticket tilts toward the cursor, in degrees. */
const MAX_TILT = 5;

/** A member's ticket, opened from the link in their email (/t/:token). Phone-first. */
@Component({
  selector: 'app-ticket-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, QrCode, AccentTitle, CountUp, Doodle, Icon, Skeleton],
  templateUrl: './ticket.page.html',
  styleUrl: './ticket.page.scss',
})
export class TicketPage {
  readonly token = input.required<string>();

  private readonly api = inject(Api);

  protected readonly ticket = rxResource({ params: () => this.token(), stream: ({ params }) => this.api.ticket(params) });
  /** Cancelling takes two taps: the first asks "are you sure?". */
  protected readonly confirming = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly error = signal('');

  /** Tilt toward the cursor on desktop: rotation around the x and y axes in degrees. */
  protected readonly tilt = signal<[number, number]>([0, 0]);
  protected readonly tiltTransform = computed(() => {
    const [x, y] = this.tilt();
    return x === 0 && y === 0 ? null : `perspective(900px) rotateX(${x}deg) rotateY(${y}deg)`;
  });
  private readonly canTilt = typeof window !== 'undefined'
    && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion();

  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  protected readonly formatTimeRange = formatTimeRange;

  constructor() {
    // While the ticket can still change, check now and then, so the "Checked in" stamp lands when the
    // door scans it, and a waitlist position counts down when people ahead cancel.
    const timer = setInterval(() => {
      const t = this.ticket.value();
      const open = t && t.status !== 'CANCELLED' && !t.checkedInAt;
      if (open && document.visibilityState === 'visible' && !this.ticket.isLoading() && !this.cancelling()) {
        this.ticket.reload();
      }
    }, REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.canTilt) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    this.tilt.set([Math.round(-y * MAX_TILT * 10) / 10, Math.round(x * MAX_TILT * 10) / 10]);
  }

  protected resetTilt(): void {
    this.tilt.set([0, 0]);
  }

  protected async cancel(): Promise<void> {
    this.cancelling.set(true);
    this.error.set('');
    try {
      const updated = await firstValueFrom(this.api.cancelTicket(this.token()));
      this.ticket.set(updated);
      this.confirming.set(false);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.cancelling.set(false);
    }
  }
}
