import { formatTime, firstName } from '../../core/format';
import { CheckInResult } from '../../core/models';

export type Tone = 'success' | 'warning' | 'danger';

export interface ResultCard {
  tone: Tone;
  icon: string;
  title: string;
  detail: string;
}

/** What the big result card says after a scan: green welcome, amber repeat, red problem. */
export function describeCheckIn(result: CheckInResult): ResultCard {
  switch (result.outcome) {
    case 'CHECKED_IN':
      return {
        tone: 'success',
        icon: 'check',
        title: `Welcome, ${firstName(result.attendeeName)}`,
        detail: `${result.attendeeName} · ${result.method === 'CARD' ? 'student card' : result.method === 'MANUAL' ? 'manual' : 'ticket'}`,
      };
    case 'ALREADY_CHECKED_IN':
      return {
        tone: 'warning',
        icon: 'alert',
        title: `Already checked in${result.checkedInAt ? ` at ${formatTime(result.checkedInAt)}` : ''}`,
        detail: result.attendeeName ?? '',
      };
    case 'WRONG_EVENT':
      return { tone: 'danger', icon: 'x', title: 'Wrong event', detail: result.message };
    case 'NOT_CONFIRMED':
      return { tone: 'danger', icon: 'x', title: 'No confirmed seat', detail: result.message };
    default:
      return { tone: 'danger', icon: 'x', title: 'Not on the list', detail: result.message };
  }
}
