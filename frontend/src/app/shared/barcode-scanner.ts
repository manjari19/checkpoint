import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export type ScanMode = 'qr' | 'card';

/** QR for tickets; the 1D formats student cards use (SFU cards are most likely Codabar). */
export const FORMATS: Record<ScanMode, BarcodeFormat[]> = {
  qr: [BarcodeFormat.QR_CODE],
  card: [BarcodeFormat.CODABAR, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39],
};

/** How long the same code is ignored after a scan, so holding a ticket in view counts once. */
const REPEAT_WINDOW_MS = 4000;

export type CameraState = 'starting' | 'scanning' | 'denied' | 'unavailable' | 'insecure';

/**
 * Live camera view that reads QR codes or barcodes and emits the decoded text.
 *
 * Uses ZXing, which decodes frames in JavaScript. That works in every modern mobile browser,
 * including iOS Safari, which has no built-in barcode detector.
 *
 * Browsers only allow camera access on secure pages (HTTPS or localhost); `cameraState` explains
 * what went wrong so the page can offer typed entry instead.
 */
@Component({
  selector: 'app-barcode-scanner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <video #video playsinline muted aria-label="Camera view"></video>
    @if (cameraState() === 'scanning') {
      <div class="frame" [class.wide]="mode() === 'card'" [class.paused]="paused()" aria-hidden="true">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <span class="line"></span>
      </div>
    } @else {
      <div class="message" role="status">
        @switch (cameraState()) {
          @case ('starting') { <span class="spinner"></span> Starting camera… }
          @case ('denied') { Camera access was blocked. Allow the camera in your browser settings, or type the code below. }
          @case ('insecure') { The camera needs a secure (HTTPS) page. Type the code below instead. }
          @default { No camera found on this device. Type the code below instead. }
        }
      </div>
    }
  `,
  styles: `
    :host { position: relative; display: block; overflow: hidden; background: #08060f; }
    video { display: block; width: 100%; height: 100%; object-fit: cover; }
    // The aiming frame: four gold corner brackets, a dimmed surround, and a scanning line sweeping
    // down and up while the camera is looking for a code.
    .frame {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(62%, 280px); aspect-ratio: 1; border-radius: 20px; overflow: hidden;
      box-shadow: 0 0 0 9999px rgba(11, 9, 21, 0.5);
      transition: width var(--dur) var(--ease), aspect-ratio var(--dur) var(--ease);
    }
    .frame.wide { width: min(84%, 420px); aspect-ratio: 2.4; }
    .corner { position: absolute; width: 28px; height: 28px; border: 3.5px solid var(--gold); }
    .tl { top: 0; left: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 20px; }
    .tr { top: 0; right: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 20px; }
    .bl { bottom: 0; left: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 20px; }
    .br { bottom: 0; right: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 20px; }
    .line {
      position: absolute; left: 8%; right: 8%; top: 8%; height: 2px; border-radius: 2px;
      background: linear-gradient(90deg, transparent, #c4b5fd 20%, #fff 50%, #c4b5fd 80%, transparent);
      box-shadow: 0 0 14px 2px rgba(139, 92, 246, 0.8);
      animation: sweep 1.8s ease-in-out infinite alternate;
    }
    .paused .line { animation-play-state: paused; opacity: 0.3; }
    @keyframes sweep { to { top: 92%; } }
    @media (prefers-reduced-motion: reduce) { .line { animation: none; top: 50%; } }
    .message {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 24px; text-align: center; color: var(--muted); font-size: 0.95rem;
    }
  `,
})
export class BarcodeScanner {
  readonly mode = input<ScanMode>('qr');
  /** While true, decoded codes are ignored (e.g. while a result is being processed). */
  readonly paused = input(false);
  readonly scanned = output<string>();

  readonly cameraState = signal<CameraState>('starting');

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private controls: IScannerControls | null = null;
  private lastCode = '';
  private lastCodeAt = 0;

  constructor() {
    // Runs after the first render (so the <video> exists) and again whenever the mode changes.
    afterRenderEffect(() => {
      const mode = this.mode();
      untracked(() => this.start(mode));
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private async start(mode: ScanMode): Promise<void> {
    this.stop();
    if (!window.isSecureContext) {
      this.cameraState.set('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraState.set('unavailable');
      return;
    }
    this.cameraState.set('starting');

    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATS[mode]],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
    try {
      this.controls = await reader.decodeFromConstraints(
        // Back camera, at a resolution high enough for the thin bars of a card barcode.
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        this.video().nativeElement,
        (result) => {
          if (result) {
            this.handle(result.getText());
          }
        },
      );
      this.cameraState.set('scanning');
    } catch (error) {
      const name = (error as { name?: string })?.name;
      this.cameraState.set(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }

  private handle(text: string): void {
    const now = Date.now();
    if (this.paused() || (text === this.lastCode && now - this.lastCodeAt < REPEAT_WINDOW_MS)) {
      return;
    }
    this.lastCode = text;
    this.lastCodeAt = now;
    this.scanned.emit(text);
  }

  private stop(): void {
    this.controls?.stop();
    this.controls = null;
  }
}
