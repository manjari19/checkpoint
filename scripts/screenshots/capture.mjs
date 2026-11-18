// Visits every page at three widths, saves a full-page screenshot of each, and reports layout problems:
// horizontal scrolling, visible elements that stick out past the right edge of the screen, and text that
// overlaps other text.
//
// Inputs (environment): TARGET_URL, OUT_DIR, PAGES (JSON list of {name, path, auth}).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import net from 'node:net';

// Browsers only allow the camera on secure pages, and http://localhost counts as secure. So the app
// (running on the host) is forwarded to localhost inside this container, and the browser uses that.
const TARGET = new URL(process.env.TARGET_URL ?? 'http://host.docker.internal:4300');
const server = net.createServer((client) => {
  const upstream = net.connect(Number(TARGET.port), TARGET.hostname);
  client.pipe(upstream).pipe(client);
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
});
await new Promise((resolve) => server.listen(4300, '127.0.0.1', resolve));
const BASE_URL = 'http://localhost:4300';
const OUT_DIR = process.env.OUT_DIR ?? '/out';
const PAGES = JSON.parse(process.env.PAGES ?? '[]');
const WIDTHS = (process.env.WIDTHS ?? '1440,768,390').split(',').map(Number);

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  args: [
    // A fake camera (a moving test pattern) that needs no permission prompt.
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

async function loggedInState() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name=email]', process.env.ORGANIZER_EMAIL ?? 'organizer@checkpoint.local');
  await page.fill('input[name=password]', process.env.ORGANIZER_PASSWORD ?? 'checkpoint-demo');
  await page.click('button[type=submit]');
  await page.waitForURL('**/overview');
  const state = await context.storageState();
  await context.close();
  return state;
}

const state = await loggedInState();
const problems = [];

for (const { name, path, auth } of PAGES) {
  for (const width of WIDTHS) {
    // Phone widths are emulated as a phone: touch input, mobile viewport rules and a high-density screen.
    const phone = width <= 430;
    const context = await browser.newContext({
      viewport: { width, height: phone ? Math.round(width * 2.16) : 900 },
      deviceScaleFactor: phone ? 2 : 1,
      isMobile: phone,
      hasTouch: phone,
      storageState: auth ? state : undefined,
      permissions: ['camera'],
      // Show times the way the club sees them.
      timezoneId: 'America/Vancouver',
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const issues = await page.evaluate(() => {
      const found = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) {
        found.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);
      }
      // Is this element inside something that scrolls or clips horizontally on purpose (tables, tabs)?
      const clipped = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.position === 'fixed') continue;
        if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) {
          found.push(`<${el.tagName.toLowerCase()} class="${el.className?.baseVal ?? el.className}"> spans ${Math.round(r.left)}–${Math.round(r.right)}px`);
        }
      }
      // Text that overlaps other text. Compares the boxes of the text itself (not of whole elements),
      // skipping decorations hidden from screen readers and anything fixed on screen (toasts).
      // Text scrolled out of view inside a scrolling box (like a long list) can't overlap anything.
      const hiddenByScroller = (el, r) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (getComputedStyle(p).overflowY === 'visible') continue;
          const box = p.getBoundingClientRect();
          if (r.bottom <= box.top + 1 || r.top >= box.bottom - 1) return true;
        }
        return false;
      };
      const texts = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!node.textContent.trim() || !el || el.closest('[aria-hidden="true"], .visually-hidden, option, select')) continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.opacity === '0') continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width > 1 && r.height > 1 && !hiddenByScroller(el, r)) texts.push({ el, r, text: node.textContent.trim().slice(0, 30) });
        }
      }
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i];
          const b = texts[j];
          if (a.el === b.el) continue;
          const overlapX = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const overlapY = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (overlapX > 2 && overlapY > 4) found.push(`text "${a.text}" overlaps "${b.text}"`);
        }
      }
      return found.slice(0, 8);
    });
    if (issues.length) problems.push({ page: name, width, issues });

    await page.screenshot({ path: `${OUT_DIR}/${name}-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log(`checked ${name}`);
}

await browser.close();
server.close();
console.log(problems.length ? JSON.stringify(problems, null, 2) : 'No layout problems found.');
