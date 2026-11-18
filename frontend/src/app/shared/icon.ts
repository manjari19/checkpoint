import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Simple stroke icons drawn on a 24x24 grid. Decorative unless a label is given. */
const PATHS: Record<string, string> = {
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 18l-6-6 6-6',
  calendar: 'M4 7h16v13H4zM4 11h16M8 3v4M16 3v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M18 21v-1a6 6 0 0 0-3-5.2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  plus: 'M12 5v14M5 12h14',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  sponsor: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z',
  ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14.5h8',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  'trend-up': 'M4 16l6-6 4 4 6-7M15 7h5v5',
  'trend-down': 'M4 8l6 6 4-4 6 7M15 17h5v-5',
  hourglass: 'M7 3h10M7 21h10M8 3c0 4 3 6 4 9-1 3-4 5-4 9M16 3c0 4-3 6-4 9 1 3 4 5 4 9',
  'user-check': 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M15.5 10.5l2.5 2.5 4.5-5',
  'user-x': 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16.5 8.5l5 5M21.5 8.5l-5 5',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  more: 'M6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM20.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
         [attr.aria-hidden]="label() ? null : 'true'" [attr.role]="label() ? 'img' : null"
         [attr.aria-label]="label() || null" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly label = input('');
  protected readonly path = computed(() => PATHS[this.name()] ?? '');
}
