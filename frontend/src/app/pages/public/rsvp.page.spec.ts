import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicEvent } from '../../core/models';
import { RsvpPage } from './rsvp.page';

/** Lets an awaited HTTP call inside the component finish, then waits for the page to re-render. */
async function settle(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

const fullEvent: PublicEvent = {
  id: 'e1', clubName: 'SFU WiCS', title: 'Networking Night', description: '', location: 'SFU Burnaby',
  startsAt: '2027-01-22T02:00:00Z', endsAt: '2027-01-22T05:00:00Z', capacity: 80, category: 'NETWORKING',
  spotsLeft: 0, waitlistLength: 3, rsvpOpen: true, sponsors: [],
};

describe('RsvpPage.toRequest', () => {
  const form = { name: ' Ada ', email: ' ada@example.com ', sponsorOptIn: true, linkCard: false, studentCardNumber: '29999000000001' };

  it('drops the card number unless the member chose to link their card', () => {
    expect(RsvpPage.toRequest(form)).toEqual({
      name: 'Ada', email: 'ada@example.com', sponsorOptIn: true, studentCardNumber: null, cardConsent: false,
    });
  });

  it('sends the card number with consent when linking', () => {
    expect(RsvpPage.toRequest({ ...form, linkCard: true })).toMatchObject({
      studentCardNumber: '29999000000001', cardConsent: true,
    });
  });
});

describe('RsvpPage', () => {
  let http: HttpTestingController;

  async function render() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RsvpPage);
    fixture.componentRef.setInput('eventId', 'e1');
    // Render once so the page requests its data. whenStable() here would wait for that request forever.
    fixture.detectChanges();
    http.expectOne('/api/public/events/e1').flush(fullEvent);
    await fixture.whenStable();
    return fixture;
  }

  it('offers the waitlist when the event is full', async () => {
    const fixture = await render();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('This event is full.');
    expect(text).toContain('Join the waitlist');
  });

  it('shows the waitlist position after joining', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('input[formControlName=name]', 'Ada Lovelace');
    type('input[formControlName=email]', 'ada@example.com');
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const call = http.expectOne('/api/public/events/e1/rsvps');
    expect(call.request.body).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', cardConsent: false });
    call.flush({ status: 'WAITLISTED', waitlistPosition: 4, manageToken: 'tok', attendeeEmail: 'ada@example.com' });
    await settle(fixture);

    expect(el.querySelector('h1')?.textContent).toContain("You're #4 on the waitlist");
    expect(el.querySelector('a.btn-primary')?.getAttribute('href')).toBe('/t/tok');
  });
});
