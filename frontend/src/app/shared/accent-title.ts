import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A big headline whose last word is set in the italic serif accent, e.g. "Networking *Night*".
 * Used for headlines only, never body text.
 */
export function splitAccent(text: string): { lead: string; accent: string } {
  const trimmed = text.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace < 0
    ? { lead: '', accent: trimmed }
    : { lead: trimmed.slice(0, lastSpace + 1), accent: trimmed.slice(lastSpace + 1) };
}

@Component({
  selector: 'app-accent-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ parts().lead }}<span class="accent">{{ parts().accent }}</span>`,
})
export class AccentTitle {
  readonly text = input.required<string>();
  protected readonly parts = computed(() => splitAccent(this.text()));
}
