import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Icon } from './icon';

/** Copies text to the clipboard and briefly says "Copied". */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button type="button" class="btn btn-small" (click)="copy()" [attr.aria-label]="ariaLabel() || null">
      <app-icon [name]="copied() ? 'check' : 'copy'" [size]="16" />
      <span aria-live="polite">{{ copied() ? 'Copied' : label() }}</span>
    </button>
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  readonly label = input('Copy');
  readonly ariaLabel = input('');
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
    } catch {
      // Clipboard access needs a secure page; fall back to a prompt the user can copy from.
      window.prompt('Copy this link:', this.text());
      return;
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }
}
