import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state';
import { SparkleField } from '../../shared/doodle';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, SparkleField],
  template: `
    <main class="vt-page">
      <app-sparkle-field />
      <h1>Page not <span class="accent">found</span>.</h1>
      <app-empty-state title="Nothing at this address" message="If you followed a link from an email, make sure you copied all of it."
                       art="search" actionLabel="Go to the organizer dashboard" link="/overview" />
    </main>
  `,
  styles: `
    main { position: relative; min-height: 100vh; display: grid; align-content: center; justify-items: center; gap: 8px;
      padding: 32px 16px; text-align: center; overflow: hidden; }
    main > *:not(app-sparkle-field) { position: relative; z-index: 1; }
    h1 { font-size: clamp(2rem, 1.5rem + 3vw, 3rem); font-weight: 520; }
  `,
})
export class NotFoundPage {}
