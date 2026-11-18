import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage, fieldErrors } from '../../core/api';
import { fromLocalInput, toLocalInput } from '../../core/format';
import { EVENT_CATEGORIES, EventCategory, EventRequest } from '../../core/models';
import { Toasts } from '../../core/toast';
import { Icon } from '../../shared/icon';
import { Skeleton } from '../../shared/skeleton';

/** Form-level check: the end time must be after the start time. */
export function endsAfterStart(group: AbstractControl): ValidationErrors | null {
  const { startsAt, endsAt } = group.value as { startsAt?: string; endsAt?: string };
  return startsAt && endsAt && endsAt <= startsAt ? { endsBeforeStart: true } : null;
}

/** Create a new event (/events/new) or edit one (/events/:eventId/edit). */
@Component({
  selector: 'app-event-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, Skeleton],
  templateUrl: './event-form.page.html',
  styleUrl: './event-form.page.scss',
})
export class EventFormPage implements OnInit {
  /** Set by the router when editing. */
  readonly eventId = input<string>();

  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  protected readonly categories = EVENT_CATEGORIES;
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      title: ['', [Validators.required, Validators.maxLength(120)]],
      category: ['NETWORKING' as EventCategory],
      description: ['', Validators.maxLength(4000)],
      location: ['', [Validators.required, Validators.maxLength(200)]],
      startsAt: ['', Validators.required],
      endsAt: ['', Validators.required],
      capacity: [50, [Validators.required, Validators.min(1), Validators.max(5000)]],
    },
    { validators: endsAfterStart },
  );

  protected readonly sponsors = signal<string[]>([]);
  protected readonly sponsorDraft = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    const id = this.eventId();
    if (!id) return;
    this.loading.set(true);
    try {
      const event = await firstValueFrom(this.api.event(id));
      this.form.setValue({
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        startsAt: toLocalInput(event.startsAt),
        endsAt: toLocalInput(event.endsAt),
        capacity: event.capacity,
      });
    } catch (e) {
      this.error.set(errorMessage(e, "Couldn't load this event."));
    } finally {
      this.loading.set(false);
    }
  }

  protected addSponsor(): void {
    const name = this.sponsorDraft().trim();
    if (name && !this.sponsors().includes(name)) {
      this.sponsors.update((list) => [...list, name]);
    }
    this.sponsorDraft.set('');
  }

  protected removeSponsor(name: string): void {
    this.sponsors.update((list) => list.filter((s) => s !== name));
  }

  /** Shows a field's error once the user has touched it or tried to submit. */
  protected showError(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: EventRequest = {
      ...value,
      startsAt: fromLocalInput(value.startsAt),
      endsAt: fromLocalInput(value.endsAt),
      sponsors: this.sponsors(),
    };
    this.saving.set(true);
    this.error.set('');
    this.serverErrors.set({});
    try {
      const id = this.eventId();
      const saved = await firstValueFrom(id ? this.api.updateEvent(id, request) : this.api.createEvent(request));
      await this.router.navigate(['/events', saved.id]);
      this.toasts.show(id ? 'Changes saved' : 'Event created. Share the RSVP link when you\'re ready.');
    } catch (e) {
      this.serverErrors.set(fieldErrors(e));
      this.error.set(errorMessage(e, "Couldn't save the event."));
    } finally {
      this.saving.set(false);
    }
  }
}
