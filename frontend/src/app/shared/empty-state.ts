import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Doodle, DoodleName } from './doodle';
import { Icon } from './icon';

/**
 * A friendly "nothing here yet" block: a small hand-drawn illustration, a short title and sentence,
 * and an outlined pill button with an arrow. Each place uses its own drawing, so two empty states side
 * by side never look the same. Give either a link (routerLink) or listen to (action).
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Doodle],
  template: `
    <app-doodle [name]="art()" />
    <h3>{{ title() }}</h3>
    @if (message()) {
      <p>{{ message() }}</p>
    }
    @if (actionLabel()) {
      @if (link()) {
        <a class="btn btn-small" [routerLink]="link()">{{ actionLabel() }} <app-icon class="arrow" name="arrow-right" [size]="16" /></a>
      } @else {
        <button type="button" class="btn btn-small" (click)="action.emit()">
          {{ actionLabel() }} <app-icon class="arrow" name="arrow-right" [size]="16" />
        </button>
      }
    }
  `,
  styles: `
    :host { display: grid; justify-items: center; gap: 6px; padding: 18px 12px 20px; text-align: center; }
    app-doodle { --doodle-width: 104px; margin-bottom: 6px; }
    h3 { font-size: 1rem; }
    p { max-width: 320px; color: var(--muted); font-size: 0.8125rem; }
    .btn { margin-top: 8px; }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly art = input<DoodleName>('ticket');
  readonly actionLabel = input('');
  readonly link = input<string | unknown[] | null>(null);
  readonly action = output<void>();
}
