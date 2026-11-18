import { Routes } from '@angular/router';
import { organizerGuard } from './core/auth';
import { OrganizerShell } from './layout/organizer-shell';

export const routes: Routes = [
  // Public pages: no login.
  { path: 'e/:eventId', title: 'RSVP · Checkpoint', loadComponent: () => import('./pages/public/rsvp.page').then((m) => m.RsvpPage) },
  { path: 't/:token', title: 'Your ticket · Checkpoint', loadComponent: () => import('./pages/public/ticket.page').then((m) => m.TicketPage) },
  { path: 'booth/:code', title: 'Sponsor booth · Checkpoint', loadComponent: () => import('./pages/public/booth.page').then((m) => m.BoothPage) },
  { path: 'login', title: 'Log in · Checkpoint', loadComponent: () => import('./pages/organizer/login.page').then((m) => m.LoginPage) },

  // Full-screen scanner, outside the sidebar layout so the camera gets the whole phone screen.
  {
    path: 'check-in',
    title: 'Check-in · Checkpoint',
    canActivate: [organizerGuard],
    loadComponent: () => import('./pages/organizer/check-in.page').then((m) => m.CheckInPage),
  },
  {
    path: 'events/:eventId/check-in',
    title: 'Check-in · Checkpoint',
    canActivate: [organizerGuard],
    loadComponent: () => import('./pages/organizer/check-in.page').then((m) => m.CheckInPage),
  },

  // Organizer pages inside the sidebar layout.
  {
    path: '',
    component: OrganizerShell,
    canActivate: [organizerGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', title: 'Overview · Checkpoint', loadComponent: () => import('./pages/organizer/overview.page').then((m) => m.OverviewPage) },
      { path: 'events', title: 'Events · Checkpoint', loadComponent: () => import('./pages/organizer/events.page').then((m) => m.EventsPage) },
      { path: 'events/new', title: 'New event · Checkpoint', loadComponent: () => import('./pages/organizer/event-form.page').then((m) => m.EventFormPage) },
      { path: 'events/:eventId/edit', title: 'Edit event · Checkpoint', loadComponent: () => import('./pages/organizer/event-form.page').then((m) => m.EventFormPage) },
      { path: 'events/:eventId', title: 'Event · Checkpoint', loadComponent: () => import('./pages/organizer/event-dashboard.page').then((m) => m.EventDashboardPage) },
      { path: 'members', title: 'Members · Checkpoint', loadComponent: () => import('./pages/organizer/members.page').then((m) => m.MembersPage) },
      { path: 'members/:memberId', title: 'Member · Checkpoint', loadComponent: () => import('./pages/organizer/member-detail.page').then((m) => m.MemberDetailPage) },
      { path: 'sponsors', title: 'Sponsors · Checkpoint', loadComponent: () => import('./pages/organizer/sponsors.page').then((m) => m.SponsorsPage) },
      { path: 'exports', title: 'Exports · Checkpoint', loadComponent: () => import('./pages/organizer/exports.page').then((m) => m.ExportsPage) },
    ],
  },

  { path: '**', title: 'Not found · Checkpoint', loadComponent: () => import('./pages/public/not-found.page').then((m) => m.NotFoundPage) },
];
