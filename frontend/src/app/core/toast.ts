import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'error';
}

/** Short confirmations ("Event created", "CSV exported") that slide in from the corner and go away. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private nextId = 1;
  readonly items = signal<Toast[]>([]);

  show(message: string, tone: Toast['tone'] = 'success', durationMs = 3500): void {
    const toast: Toast = { id: this.nextId++, message, tone };
    // At most three at once; the oldest goes first.
    this.items.update((list) => [...list.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
