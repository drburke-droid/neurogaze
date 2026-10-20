// Renders the still trigeminal nerve diagram used on the Neurolens page (img/trigeminal.webp).
// Serve the repository locally, then:
//   node tools/trigeminal-figure.mjs http://localhost:8080/neurolens.html img/trigeminal.png
// and convert the PNG to WebP (for example: cwebp -q 82 img/trigeminal.png -o img/trigeminal.webp).
// Needs Playwright with Chromium; set PLAYWRIGHT_MODULE to its path if it isn't installed here.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [url = 'http://localhost:8080/neurolens.html', out = 'img/trigeminal.png'] = process.argv.slice(2);

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
const page = await browser.newPage({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 1.5 });
await page.goto(url);
await page.addStyleTag({ content: '.stage { width: 640px !important; height: 640px !important; aspect-ratio: auto !important; max-height: none !important; } .story, .credit { display: none !important; }' });
await page.waitForFunction(() => document.getElementById('loader').hidden, null, { timeout: 120000 });
await page.evaluate(() => { window.__nl.goNerve('map'); window.__nl.nerveMode = 'figure'; });
await page.waitForTimeout(Number(process.env.WAIT || 6000)); // the head turns, then the nerve fades in
// Repaint the drawing in one go before capturing it
await page.evaluate(() => { const s = document.getElementById('nerves'); s.style.display = 'none'; s.getBoundingClientRect(); s.style.display = ''; });
await page.waitForTimeout(300);
await (await page.$('#stage')).screenshot({ path: out });
await browser.close();
console.log(`Saved ${out}`);
