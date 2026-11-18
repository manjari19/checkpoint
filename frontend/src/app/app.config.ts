import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './core/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Route parameters such as :id are passed straight into component inputs. Page changes use the
    // browser's View Transitions API where it exists (styled in styles.scss); elsewhere they just swap.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    // HttpClient's built-in CSRF support reads the XSRF-TOKEN cookie and sends it back in the
    // X-XSRF-TOKEN header on every write request, which is what Spring Security expects.
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
  ],
};
