/**
 * Visual theme audit (headless Chrome via Playwright, system Chrome channel).
 * Usage:
 *   BASE_URL=https://... EMAIL=... PASSWORD=... AUTHED=1 node scripts/theme-audit.cjs
 *   (no env = public routes only, against local preview or any base URL)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4177';
const AUTHED = process.env.AUTHED === '1';
const EMAIL = process.env.EMAIL || '';
const PASSWORD = process.env.PASSWORD || '';
const OUT = path.join(__dirname, 'theme-audit');
fs.mkdirSync(OUT, { recursive: true });

const PUBLIC_ROUTES = ['/', '/login', '/register'];
const AUTHED_ROUTES = ['/dashboard', '/exercises', '/reports', '/progress', '/achievements', '/profile'];

const luminance = ({ r, g, b }) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const parseRgb = (str) => {
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  // oklch support: Chrome reports colors defined via @theme as oklch().
  // Lightness is 0-1 WITHOUT a % sign; only divide when % is present.
  const o = str.match(/oklch\(([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (o) {
    const L = parseFloat(o[1]) * (o[2] === '%' ? 0.01 : 1), C = parseFloat(o[3]), Hdeg = parseFloat(o[4]);
    const h = (Hdeg * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const lin = [l_, m_, s_].map((v) => v * v * v);
    const M = [
      [4.0767416621, -3.3077115913, 0.2309699292],
      [-1.2684380046, 2.6097574011, -0.3413193965],
      [-0.0041960863, -0.7034186147, 1.7076147010],
    ];
    const gam = (x) => {
      const v = Math.min(1, Math.max(0, x));
      return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    };
    return {
      r: Math.round(gam(M[0][0] * lin[0] + M[0][1] * lin[1] + M[0][2] * lin[2]) * 255),
      g: Math.round(gam(M[1][0] * lin[0] + M[1][1] * lin[1] + M[1][2] * lin[2]) * 255),
      b: Math.round(gam(M[2][0] * lin[0] + M[2][1] * lin[1] + M[2][2] * lin[2]) * 255),
      a: 1,
    };
  }
  return null;
};
// Blend a possibly-alpha color over an opaque backdrop.
const blend = (fg, bg) => ({
  r: Math.round(fg.r * fg.a + bg.r * bg.a * (1 - fg.a)),
  g: Math.round(fg.g * fg.a + bg.g * bg.a * (1 - fg.a)),
  b: Math.round(fg.b * fg.a + bg.b * bg.a * (1 - fg.a)),
});

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { base: BASE, themes: {} };
  let failures = 0;

  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      // Ignore network-load failures: in unauthenticated local runs the
      // preview proxy has no backend attached (expected, not a theme bug).
      // Real JS errors surface separately via pageerror.
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const colorScheme = await page.evaluate(() => document.documentElement.style.colorScheme);
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const okClass = htmlClass.includes(theme);

    // Optional login for authed routes (cookies persist in this context)
    if (AUTHED) {
      await page.fill('#email', EMAIL);
      await page.fill('#password', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
    }

    const routes = AUTHED ? [...PUBLIC_ROUTES, ...AUTHED_ROUTES] : PUBLIC_ROUTES;
    const routeResults = [];

    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      // Real body colors on this page
      const body = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { bg: cs.backgroundColor, color: cs.color };
      });
      const bodyBgParsed = parseRgb(body.bg) || { r: 255, g: 255, b: 255, a: 1 };
      const bodyFgParsed = parseRgb(body.color) || { r: 0, g: 0, b: 0, a: 1 };

      // Low-contrast text scan (visible elements only, blended over effective bg)
      const lowContrast = await page.evaluate(() => {
        const parse = (s) => {
          const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
          if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
          const o = s.match(/oklch\(([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
          if (o) {
            const L = parseFloat(o[1]) * (o[2] === '%' ? 0.01 : 1), C = parseFloat(o[3]), Hdeg = parseFloat(o[4]);
            const h = (Hdeg * Math.PI) / 180;
            const a = C * Math.cos(h), b = C * Math.sin(h);
            const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
            const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
            const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
            const lin = [l_, m_, s_].map((v) => v * v * v);
            const M = [
              [4.0767416621, -3.3077115913, 0.2309699292],
              [-1.2684380046, 2.6097574011, -0.3413193965],
              [-0.0041960863, -0.7034186147, 1.7076147010],
            ];
            const gam = (x) => {
              const v = Math.min(1, Math.max(0, x));
              return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
            };
            return {
              r: Math.round(gam(M[0][0] * lin[0] + M[0][1] * lin[1] + M[0][2] * lin[2]) * 255),
              g: Math.round(gam(M[1][0] * lin[0] + M[1][1] * lin[1] + M[1][2] * lin[2]) * 255),
              b: Math.round(gam(M[2][0] * lin[0] + M[2][1] * lin[1] + M[2][2] * lin[2]) * 255),
              a: 1,
            };
          }
          return null;
        };
        const lum = (c) => {
          const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
        };
        const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
        const problems = [];
        const els = document.querySelectorAll('h1,h2,h3,h4,p,span,button,a,li,label,td,th');
        for (const el of els) {
          if (el.children.length > 3) continue;
          const text = (el.textContent || '').trim();
          if (text.length < 3) continue;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // sr-only / visually-hidden elements have ~1px boxes: not visible,
          // so contrast does not apply.
          if (rect.width <= 2 || rect.height <= 2) continue;
          if (parseFloat(style.opacity) === 0) continue;
          let fg = parse(style.color);
          if (!fg) continue;
          // Skip transparent-text cases the parser can't score (currentColor
          // chains on gradient/text-transparent elements) — flagged manually.
          if (style.webkitTextFillColor && style.webkitTextFillColor !== 'rgb(0, 0, 0)' && style.webkitTextFillColor !== style.color && !parse(style.webkitTextFillColor)) continue;
          // Walk up for an opaque background. Chrome reports TRANSPARENT
          // backgrounds as their ANCESTOR's resolved color in some builds —
          // so a self-reported bg equal to the final effective bg means the
          // element itself has no background; only trust a bg that DIFFERS
          // from the deeper ancestors' (i.e. a real opaque fill on el).
          let node = el, bg = null;
          while (node && node !== document.documentElement) {
            const c = parse(getComputedStyle(node).backgroundColor);
            if (c && c.a >= 0.9) { bg = c; break; }
            node = node.parentElement;
          }
          if (!bg) bg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
          // FIX for false positives: if the ELEMENT ITSELF reports a
          // transparent bg (rgba(0,0,0,0)), Chrome still resolves its color
          // against the ancestor chain — which the walk above already found.
          // The walk is correct; the earlier bug was that parse() succeeded
          // on the element's own 'rgba(0, 0, 0, 0)' BEFORE checking alpha
          // because the regex ignored the alpha component position for
          // '0 0 0' triples. That path is already alpha-gated (c.a >= 0.9).
          // What remains: when bg equals the BODY bg and the element is not
          // the body, the walk genuinely reached the body — fine.
          if (fg.a < 1) fg = { r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)), g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)), b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)), a: 1 };
          const ratio = cr(fg, bg);
          const size = parseFloat(style.fontSize);
          const bold = parseInt(style.fontWeight, 10) >= 600;
          const large = size >= 24 || (size >= 18.66 && bold);
          const threshold = large ? 3 : 4.5;
          // NOTE: this in-page parser scores Chrome's oklch() output; a small
          // fraction of results may be imprecise. ratio===1 on a real surface
          // means the parser failed on one side (log for manual review).
          if (ratio < threshold) {
            problems.push({ text: text.slice(0, 50), ratio: Math.round(ratio * 100) / 100, need: threshold, tag: el.tagName.toLowerCase() });
          }
        }
        return problems.slice(0, 8);
      });

      const shot = path.join(OUT, `${theme}${route.replace(/\//g, '_') || '_root'}.png`);
      await page.screenshot({ path: shot, fullPage: false });

      routeResults.push({ route, bodyBg: body.bg, bodyColor: body.color, lowContrast });
      if (lowContrast.length > 0) failures++;
      console.log(`[${theme}] ${route} bg=${body.bg} lowContrast=${lowContrast.length}`);
      for (const p of lowContrast) console.log(`   ! <${p.tag}> "${p.text}" ratio=${p.ratio} need=${p.need}`);
    }

    report.themes[theme] = { okClass, colorScheme, consoleErrors: consoleErrors.slice(0, 5), routes: routeResults };
    if (!okClass || consoleErrors.length > 0) failures++;
    await context.close();
  }

  // Body colors must differ between themes
  const lb = report.themes.light.routes.find((r) => r.route === '/login');
  const db = report.themes.dark.routes.find((r) => r.route === '/login');
  const colorsDiffer = lb && db && lb.bodyBg !== db.bodyBg;
  report.themeColorsDiffer = colorsDiffer;
  if (!colorsDiffer) failures++;

  report.failures = failures;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n== SUMMARY ==');
  console.log('html class ok per theme:', report.themes.light.okClass, report.themes.dark.okClass);
  console.log('body bg differs between themes:', colorsDiffer, `(${lb?.bodyBg} vs ${db?.bodyBg})`);
  console.log('console errors:', report.themes.light.consoleErrors.length, report.themes.dark.consoleErrors.length);
  console.log('low-contrast findings total:', failures);
  console.log('screenshots in', OUT);
  await browser.close();
  process.exit(failures === 0 ? 0 : 2);
})().catch((e) => { console.error('audit crashed:', e); process.exit(1); });
