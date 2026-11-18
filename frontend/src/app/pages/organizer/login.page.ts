import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/api';
import { Doodle, SparkleField } from '../../shared/doodle';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Icon, Doodle, SparkleField],
  template: `
    <main class="wrap vt-page">
      <div class="card shell" animate.enter="rise">
        <aside class="art">
          <app-sparkle-field />
          <div class="brand"><span class="logo" aria-hidden="true"><app-icon name="check" [size]="16" /></span>Checkpoint</div>
          <app-doodle name="door" class="door pop-in" />
          <p class="tagline">RSVPs, waitlists and check-in for student clubs. <span class="accent">See you at the door.</span></p>
        </aside>

        <form (ngSubmit)="submit()" #form="ngForm">
          <h1>Welcome <span class="accent">back</span>.</h1>
          <p class="muted">Log in to run your club's events.</p>

          @if (error()) {
            <p class="alert" role="alert" animate.enter="pop">{{ error() }}</p>
          }

          <label class="field">
            <span>Email</span>
            <input class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
          </label>
          <label class="field">
            <span>Password</span>
            <input class="input" type="password" name="password" [(ngModel)]="password" required
                   autocomplete="current-password" />
          </label>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || form.invalid">
            {{ busy() ? 'Logging in…' : 'Log in' }}
            @if (!busy()) { <app-icon class="arrow" name="arrow-right" [size]="17" /> }
          </button>
        </form>
      </div>
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 32px 16px;
      background: radial-gradient(60% 50% at 50% 0%, rgba(139, 92, 246, 0.2), transparent 70%), var(--bg); }
    .shell { display: grid; grid-template-columns: 1fr 1fr; width: min(820px, 100%); padding: 0; overflow: hidden; }
    .art { position: relative; display: grid; align-content: space-between; gap: 18px; padding: 26px; overflow: hidden;
      background: radial-gradient(90% 80% at 30% 100%, rgba(139, 92, 246, 0.3), transparent 70%), linear-gradient(160deg, #1f1840, #141026);
      border-right: 1px solid var(--border); }
    .art > *:not(app-sparkle-field) { position: relative; z-index: 1; }
    .brand { display: flex; align-items: center; gap: 10px; font-family: var(--font-serif); font-weight: 600; font-size: 1.15rem; }
    .logo { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: #2a2047;
      box-shadow: inset 0 0 0 1px rgba(240, 165, 0, 0.35); color: var(--gold); }
    .door { --doodle-width: 190px; justify-self: center; }
    .tagline { color: var(--muted); font-size: 0.9rem; max-width: 300px; }
    .tagline .accent { display: block; margin-top: 4px; font-size: 1.25rem; }
    form { display: grid; align-content: center; gap: 14px; padding: 34px 30px; }
    h1 { font-size: 2.1rem; font-weight: 520; }
    @media (max-width: 700px) {
      .shell { grid-template-columns: 1fr; width: min(420px, 100%); }
      .art { border-right: 0; border-bottom: 1px solid var(--border); grid-template-columns: 1fr auto; align-items: center; padding: 18px 20px; }
      .door { --doodle-width: 84px; grid-row: 1 / span 2; grid-column: 2; }
      .tagline { font-size: 0.8125rem; }
      form { gap: 12px; padding: 22px 18px 24px; }
      h1 { font-size: 1.8rem; }
    }
  `,
})
export class LoginPage {
  /** Where to go after logging in; set by the route guard. */
  readonly returnUrl = input<string>('/overview');

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl(this.returnUrl() || '/overview');
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 401
        ? 'That email and password don’t match an organizer account.'
        : errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
