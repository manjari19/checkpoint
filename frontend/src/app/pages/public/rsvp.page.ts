import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage, fieldErrors } from '../../core/api';
import { formatDate, formatLongDate, formatTimeRange } from '../../core/format';
import { categoryLabel } from '../../core/models';
import { RsvpRequest, Ticket } from '../../core/models';
import { AccentTitle } from '../../shared/accent-title';
import { BarcodeScanner } from '../../shared/barcode-scanner';
import { Confetti } from '../../shared/confetti';
import { CountUp } from '../../shared/count-up';
import { Doodle, SparkleField } from '../../shared/doodle';
import { Icon } from '../../shared/icon';
import { Skeleton } from '../../shared/skeleton';

/** Public RSVP page for one event (/e/:eventId). Phone-first. */
@Component({
  selector: 'app-rsvp-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, AccentTitle, BarcodeScanner, Confetti, CountUp, Doodle, SparkleField, Skeleton],
  templateUrl: './rsvp.page.html',
  styleUrl: './rsvp.page.scss',
})
export class RsvpPage {
  readonly eventId = input.required<string>();

  private readonly api = inject(Api);

  protected readonly event = rxResource({ params: () => this.eventId(), stream: ({ params }) => this.api.publicEvent(params) });

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    sponsorOptIn: [false],
    linkCard: [false],
    studentCardNumber: ['', Validators.maxLength(40)],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});
  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly scanningCard = signal(false);

  protected readonly isFull = computed(() => (this.event.value()?.spotsLeft ?? 1) <= 0);
  protected readonly formatLongDate = formatLongDate;
  protected readonly formatTimeRange = formatTimeRange;
  protected readonly formatDate = formatDate;
  protected readonly categoryLabel = categoryLabel;

  /** Turns the form into the API request. A card number is only sent with consent. */
  static toRequest(value: { name: string; email: string; sponsorOptIn: boolean; linkCard: boolean; studentCardNumber: string }): RsvpRequest {
    const card = value.linkCard ? value.studentCardNumber.trim() : '';
    return {
      name: value.name.trim(),
      email: value.email.trim(),
      sponsorOptIn: value.sponsorOptIn,
      studentCardNumber: card || null,
      cardConsent: !!card,
    };
  }

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected onCardScanned(code: string): void {
    this.form.controls.studentCardNumber.setValue(code);
    this.scanningCard.set(false);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.serverErrors.set({});
    try {
      const ticket = await firstValueFrom(this.api.rsvp(this.eventId(), RsvpPage.toRequest(this.form.getRawValue())));
      this.ticket.set(ticket);
      window.scrollTo({ top: 0 });
    } catch (e) {
      this.serverErrors.set(fieldErrors(e));
      this.error.set(errorMessage(e));
    } finally {
      this.submitting.set(false);
    }
  }
}
