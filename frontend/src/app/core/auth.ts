import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { Organizer } from './models';

/**
 * Who is logged in. The session itself lives in an HttpOnly cookie the app cannot read, so the app asks
 * the server (/api/auth/me) once and remembers the answer here.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);

  /** undefined = not checked yet, null = logged out. */
  readonly organizer = signal<Organizer | null | undefined>(undefined);

  async ensureLoaded(): Promise<Organizer | null> {
    const known = this.organizer();
    if (known !== undefined) {
      return known;
    }
    try {
      const me = await firstValueFrom(this.http.get<Organizer>('/api/auth/me'));
      this.organizer.set(me);
    } catch {
      this.organizer.set(null);
    }
    return this.organizer() ?? null;
  }

  async login(email: string, password: string): Promise<Organizer> {
    // Make sure the XSRF-TOKEN cookie exists before the first write request.
    await this.ensureLoaded();
    const me = await firstValueFrom(this.http.post<Organizer>('/api/auth/login', { email, password }));
    this.organizer.set(me);
    return me;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } finally {
      this.organizer.set(null);
    }
  }
}

/** Route guard for organizer pages: logged-out visitors go to the login page and come back afterwards. */
export const organizerGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  return (await auth.ensureLoaded())
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** If the session expires mid-use, any organizer request comes back 401: send the user to log in again. */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      const isOrganizerCall = request.url.startsWith('/api/') && !request.url.startsWith('/api/auth/')
        && !request.url.startsWith('/api/public/') && !request.url.startsWith('/api/booth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && isOrganizerCall) {
        auth.organizer.set(null);
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
