import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Api, errorMessage, exportUrls, fieldErrors } from './api';

describe('Api', () => {
  let api: Api;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts an RSVP to the public endpoint', async () => {
    const request = { name: 'Ada', email: 'ada@example.com', sponsorOptIn: true, studentCardNumber: null, cardConsent: false };
    const result = firstValueFrom(api.rsvp('event-1', request));

    const call = http.expectOne('/api/public/events/event-1/rsvps');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ status: 'CONFIRMED' });

    expect((await result).status).toBe('CONFIRMED');
  });

  it('sends the term as a query parameter', () => {
    api.members('2027-spring').subscribe();
    const call = http.expectOne((r) => r.url === '/api/members');
    expect(call.request.params.get('term')).toBe('2027-spring');
    call.flush([]);
  });

  it('checks in by card at the card endpoint', () => {
    api.checkInByCard('event-1', '29999000000001').subscribe();
    const call = http.expectOne('/api/events/event-1/check-ins/card');
    expect(call.request.body).toEqual({ cardNumber: '29999000000001' });
    call.flush({ outcome: 'CHECKED_IN' });
  });

  it('builds CSV download links', () => {
    expect(exportUrls.attendance('2027-spring')).toBe('/api/reports/attendance.csv?term=2027-spring');
    expect(exportUrls.attendance()).toBe('/api/reports/attendance.csv');
    expect(exportUrls.sponsorContacts('e1')).toBe('/api/events/e1/sponsor-leads.csv');
  });
});

describe('errorMessage', () => {
  it('uses the problem detail from the server', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'This email already has an RSVP.' } });
    expect(errorMessage(error)).toBe('This email already has an RSVP.');
  });

  it('explains network failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain("Can't reach the server");
  });

  it('falls back to a generic message', () => {
    expect(errorMessage(new Error('boom'), 'Fallback')).toBe('Fallback');
  });

  it('reads field errors from a 400 response', () => {
    const error = new HttpErrorResponse({ status: 400, error: { errors: { email: 'must be a well-formed email address' } } });
    expect(fieldErrors(error)).toEqual({ email: 'must be a well-formed email address' });
    expect(fieldErrors(new HttpErrorResponse({ status: 409 }))).toEqual({});
  });
});
