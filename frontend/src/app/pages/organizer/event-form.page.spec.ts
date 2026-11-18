import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { EventFormPage, endsAfterStart } from './event-form.page';

describe('endsAfterStart', () => {
  it('flags an end time before the start time', () => {
    const group = (startsAt: string, endsAt: string) =>
      new FormGroup({ startsAt: new FormControl(startsAt), endsAt: new FormControl(endsAt) });
    expect(endsAfterStart(group('2027-01-21T19:00', '2027-01-21T18:00'))).toEqual({ endsBeforeStart: true });
    expect(endsAfterStart(group('2027-01-21T19:00', '2027-01-21T22:00'))).toBeNull();
  });
});

describe('EventFormPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });

  it('does not submit an incomplete form and shows the errors', async () => {
    const fixture = TestBed.createComponent(EventFormPage);
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();

    http.expectNone('/api/events');
    expect(fixture.nativeElement.textContent).toContain('Give the event a title.');
  });

  it('creates the event with ISO times and its sponsors', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EventFormPage);
    await fixture.whenStable();
    const page = fixture.componentInstance as unknown as {
      form: FormGroup; sponsorDraft: { set(v: string): void }; addSponsor(): void; save(): Promise<void>;
    };
    page.form.patchValue({ title: 'Networking Night', location: 'SFU Burnaby', startsAt: '2027-01-21T19:00',
      endsAt: '2027-01-21T22:00', capacity: 80 });
    page.sponsorDraft.set('SAP');
    page.addSponsor();

    const saved = page.save();
    const call = http.expectOne('/api/events');
    expect(call.request.body).toMatchObject({
      title: 'Networking Night', capacity: 80, sponsors: ['SAP'],
      startsAt: new Date('2027-01-21T19:00').toISOString(),
    });
    call.flush({ id: 'new-id' });
    await saved;
    expect(navigate).toHaveBeenCalledWith(['/events', 'new-id']);
  });
});
