import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode';

/**
 * Renders text as a QR code (SVG). Dark modules on a white square, because phone cameras and
 * scanners read dark-on-light codes most reliably, even on a dark-themed page.
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="qr" [innerHTML]="svg()" role="img" [attr.aria-label]="label()"></div>`,
  styles: `
    :host { display: block; }
    .qr { background: #fff; border-radius: 12px; padding: 10px; line-height: 0; }
    .qr ::ng-deep svg { width: 100%; height: auto; display: block; }
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly label = input('Ticket QR code');

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly svg = signal<SafeHtml>('');

  constructor() {
    effect(() => {
      const value = this.value();
      QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#17132a', light: '#ffffff' } })
        // The SVG comes from the qrcode library, not from user input, so it is safe to insert.
        .then((svg) => this.svg.set(this.sanitizer.bypassSecurityTrustHtml(svg)));
    });
  }
}
