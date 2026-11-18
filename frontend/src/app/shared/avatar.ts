import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TINTS = ['purple', 'coral', 'teal', 'blue', 'amber'] as const;

/** "Ada Lovelace" -> "AL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** The same name always gets the same color. */
export function avatarTint(name: string): (typeof TINTS)[number] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/** A round badge with someone's initials. Decorative: their name is always written next to it. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ letters() }}`,
  host: { 'aria-hidden': 'true', '[class]': '"tint-" + tint()', '[style.--size.px]': 'size()' },
  styles: `
    :host {
      display: inline-grid; place-items: center; flex: none;
      width: var(--size); height: var(--size); border-radius: 50%;
      font-size: calc(var(--size) * 0.36); font-weight: 700; letter-spacing: 0.02em;
      background: var(--a-bg); color: var(--a-fg);
      box-shadow: inset 0 0 0 1px var(--a-ring);
    }
    :host(.tint-purple) { --a-bg: #2f2458; --a-fg: #d4c6ff; --a-ring: rgba(139, 92, 246, 0.4); }
    :host(.tint-coral) { --a-bg: #45262a; --a-fg: #ffc4b4; --a-ring: rgba(233, 150, 127, 0.4); }
    :host(.tint-teal) { --a-bg: #173a3b; --a-fg: #a7f0e2; --a-ring: rgba(45, 212, 191, 0.35); }
    :host(.tint-blue) { --a-bg: #1d2c4f; --a-fg: #c3dafe; --a-ring: rgba(96, 165, 250, 0.4); }
    :host(.tint-amber) { --a-bg: #3e3019; --a-fg: #fde3a7; --a-ring: rgba(245, 184, 61, 0.4); }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(32);
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly tint = computed(() => avatarTint(this.name()));
}

/** Overlapping avatars with a "+N" bubble for everyone not shown. */
@Component({
  selector: 'app-avatar-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    @for (name of shown(); track $index) {
      <app-avatar [name]="name" [size]="size()" [style.--i]="$index" />
    }
    @if (more() > 0) {
      <span class="more" aria-hidden="true">+{{ more() }}</span>
    }
  `,
  host: { '[style.--size.px]': 'size()' },
  styles: `
    :host { display: inline-flex; align-items: center; }
    app-avatar { box-shadow: 0 0 0 2px var(--surface), inset 0 0 0 1px var(--a-ring); }
    .more { box-shadow: 0 0 0 2px var(--surface); }
    app-avatar + app-avatar, app-avatar + .more { margin-left: calc(var(--size) * -0.18); }
    .more {
      display: inline-grid; place-items: center; height: var(--size); min-width: var(--size); padding: 0 6px;
      border-radius: 999px; background: var(--surface-3); color: var(--text);
      font-size: calc(var(--size) * 0.34); font-weight: 700;
    }
  `,
})
export class AvatarStack {
  readonly names = input.required<string[]>();
  /** Everyone, including people not in names. */
  readonly total = input<number | null>(null);
  readonly max = input(5);
  readonly size = input(30);
  protected readonly shown = computed(() => this.names().slice(0, this.max()));
  protected readonly more = computed(() => (this.total() ?? this.names().length) - this.shown().length);
}
