// Renders YouTube thumbnail options for the BVD video (1280×720 JPEGs) from the 3D story in video.html.
// Serve the repository locally, then:
//   node tools/thumbnails.mjs --url http://localhost:8080/ --out thumbs/ [--only d-red-dot]
// Needs Playwright with Chromium (PLAYWRIGHT_MODULE, CHROMIUM and SWIFTSHADER as for record-video.mjs).
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'http://localhost:8080/').replace(/\/?$/, '/');
const OUT = resolve(arg('out', 'thumbs'));
const ONLY = arg('only', null);
// The site's fonts, embedded so the composed thumbnail doesn't depend on the server
const font = (f) => `url(data:font/woff2;base64,${readFileSync(new URL(`../vendor/fonts/${f}`, import.meta.url)).toString('base64')}) format("woff2")`;
const FONTS = `@font-face { font-family: P; font-weight: 700; src: ${font('poppins-700.woff2')}; }
    @font-face { font-family: U; font-weight: 100 900; src: ${font('urbanist.woff2')}; }`;
mkdirSync(OUT, { recursive: true });

// Each option: a moment from the story (shifted sideways in the frame) and a few large words beside it
const OPTIONS = [
  { name: 'a-xray', view: 'eyes', step: 'peek', cover: 'R', peek: true, shift: -230, wait: 9000,
    words: '<b class="big">20/20</b><span>But your eyes<br>still hurt?</span>' },
  { name: 'b-symptoms', view: 'story', step: 'route', nerve: 'pain', shift: 0, left: true, wait: 6000,
    words: '<span>Eyes sore by</span><b class="big">3 PM?</b><small>Could it be BVD?</small>' },
  { name: 'c-nerve', view: 'story', step: 'overload', shift: 210, left: true, wait: 16000, big: 104,
    words: '<span>A hidden cause of</span><b class="big">sore eyes?</b><small>Binocular vision dysfunction</small>' },
  // The cover test you can try: a red dot that jumps (a faded copy where it was, and motion lines)
  { name: 'd-red-dot', view: 'eyes', step: 'peek', cover: 'L', noStick: true, shift: 270, left: true, wait: 7000, big: 170,
    words: `<svg class="jump" viewBox="0 0 330 140" width="330" height="140">
        <defs><radialGradient id="g" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#e3141b"/></radialGradient>
        <filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="14"/></filter></defs>
        <circle cx="62" cy="70" r="44" fill="#ff3b3b" opacity=".28" stroke="#fff" stroke-opacity=".35" stroke-width="8"/>
        <g stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"><path d="M118 46h52M108 70h72M118 94h52"/></g>
        <circle cx="262" cy="70" r="70" fill="#ff3b3b" opacity=".75" filter="url(#glow)"/>
        <circle cx="262" cy="70" r="52" fill="url(#g)" stroke="#fff" stroke-width="10"/></svg>
      <span>Did it</span><b class="big">jump?</b><small>Try this 10-second eye test</small>` },
].filter((o) => !ONLY || o.name === ONLY);

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--ignore-gpu-blocklist', ...(process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('Page error:', e.message));
await page.goto(`${BASE}video.html`);
await page.waitForFunction(() => window.__video?.ready, null, { timeout: 180000 });
await page.addStyleTag({ content: '.play, .ov, .nv-meter, .nv-labels { display: none !important; }' });

const compose = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const o of OPTIONS) {
  await page.evaluate((o) => {
    const nl = window.__nl;
    nl.view = o.view;
    nl.go(o.step);
    nl.nerveReveal = o.nerve === 'pain' ? { gEye: 0, gHead: 0, gJaw: 0, gNeck: 0 } : null; // every pain spot at once
    nl.nerveMode = o.nerve || null;
    if (o.nerve) nl.snap(); // straight to the profile, with the drawing in
    if (o.cover) nl.paddleOver(o.cover, false);
    if (o.peek) nl.setPeek(true);
    nl.caption = '';
    document.getElementById('story').classList.add('empty');
    for (const id of ['stick-shadow', 'stick-rod', 'stick-ball', 'ring-R', 'ring-L']) document.getElementById(id).style.visibility = o.noStick ? 'hidden' : '';
  }, { view: o.view, step: o.step, cover: o.cover, peek: o.peek, nerve: o.nerve, noStick: o.noStick });
  await page.waitForTimeout(o.wait);
  const still = (await page.screenshot({ type: 'png' })).toString('base64');
  await compose.setContent(`<!doctype html><html><head><base href="${BASE}"><style>
    ${FONTS}
    body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: #0b0d12; position: relative; }
    img { position: absolute; top: 0; left: ${o.shift}px; width: 1280px; height: 720px; }
    .shade { position: absolute; inset: 0; background: linear-gradient(${o.left ? '270deg' : '90deg'}, rgba(8,11,16,0) 30%, rgba(8,11,16,.9) 62%); }
    .words { position: absolute; top: 50%; transform: translateY(-50%); ${o.left ? 'left: 56px' : 'right: 56px'}; width: 520px; text-align: ${o.left ? 'left' : 'right'}; color: #fff; text-shadow: 0 6px 24px rgba(0,0,0,.7); }
    .words span { display: block; font: 700 64px/1.05 P; text-transform: uppercase; }
    .words .big { display: block; font: 700 ${o.big || 150}px/1 P; color: #ffcf5a; letter-spacing: -.02em; text-transform: uppercase; }
    .words .jump { display: block; margin: 0 0 22px -6px; overflow: visible; }
    .words small { display: block; margin-top: 18px; font: 700 34px U; color: #fff; background: #ff6a4d; padding: 6px 18px; border-radius: 12px; display: inline-block; text-transform: none; }
  </style></head><body><img src="data:image/png;base64,${still}"><div class="shade"></div><div class="words">${o.words}</div></body></html>`);
  await compose.evaluate(async () => { await Promise.all([...document.fonts].map((f) => f.load())); await document.fonts.ready; });
  await compose.screenshot({ path: join(OUT, `thumb-${o.name}.jpg`), type: 'jpeg', quality: 90 });
  console.log(`Saved thumb-${o.name}.jpg`);
}
await browser.close();
