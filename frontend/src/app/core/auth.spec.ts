import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Auth, organizerGuard } from './auth';

describe('Auth', () => {
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  it('remembers that nobody is logged in after a 401', async () => {
    const loaded = auth.ensureLoaded();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await loaded).toBeNull();

    // Asking again does not call the server a second time.
    expect(await auth.ensureLoaded()).toBeNull();
    http.expectNone('/api/auth/me');
  });

  it('sends logged-out visitors to the login page with a return URL', async () => {
    auth.organizer.set(null);
    const result = await TestBed.runInInjectionContext(() =>
      organizerGuard({} as ActivatedRouteSnapshot, { url: '/members' } as RouterStateSnapshot));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login?returnUrl=%2Fmembers');
  });

  it('lets logged-in organizers through', async () => {
    auth.organizer.set({ id: '1', clubId: 'c', clubName: 'Club', email: 'a@b.c', displayName: 'Ada' });
    const result = await TestBed.runInInjectionContext(() =>
      organizerGuard({} as ActivatedRouteSnapshot, { url: '/members' } as RouterStateSnapshot));
    expect(result).toBe(true);
  });
});
