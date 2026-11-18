import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Auth } from '../core/auth';
import { Avatar } from '../shared/avatar';
import { Icon } from '../shared/icon';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

/**
 * Frame around every organizer page: a sidebar on wide screens, and a top bar with a menu button
 * that opens the same navigation as a drawer on phones and tablets.
 */
@Component({
  selector: 'app-organizer-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Avatar],
  templateUrl: './organizer-shell.html',
  styleUrl: './organizer-shell.scss',
})
export class OrganizerShell {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Main',
      items: [
        { label: 'Overview', path: '/overview', icon: 'home' },
        { label: 'Events', path: '/events', icon: 'calendar' },
        { label: 'Check-in', path: '/check-in', icon: 'scan' },
      ],
    },
    {
      title: 'Club',
      items: [
        { label: 'Members', path: '/members', icon: 'users' },
        { label: 'Sponsors', path: '/sponsors', icon: 'sponsor' },
        { label: 'Exports', path: '/exports', icon: 'download' },
      ],
    },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly organizer = this.auth.organizer;

  constructor() {
    // Close the phone menu after navigating.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
