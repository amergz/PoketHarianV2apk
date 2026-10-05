// Salin web/ -> www/ dan muat turun semua library CDN ke www/vendor/
// supaya APK berfungsi 100% offline (tak bergantung pada internet).
// Dijalankan dalam GitHub Actions (perlu internet semasa build sahaja).
import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'www');
const VENDOR = path.join(OUT, 'vendor');

// User-Agent Chrome moden supaya Google Fonts beri fail woff2
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

async function get(url, asText = true) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return asText ? await r.text() : Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i === 3) throw new Error(`Gagal muat turun ${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 1500 * i));
    }
  }
}

// Muat turun CSS + semua fail dalam url(...) (font, webfonts) ke vendor/assets/
async function vendorCss(url, outName) {
  let css = await get(url);
  const assetDir = path.join(VENDOR, 'assets');
  await mkdir(assetDir, { recursive: true });
  const seen = new Map();
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  for (const m of [...css.matchAll(re)]) {
    const raw = m[2];
    if (raw.startsWith('data:') || seen.has(raw)) continue;
    const abs = new URL(raw, url);
    const base = path.basename(abs.pathname);
    const local = `assets/${base}`;
    await writeFile(path.join(assetDir, base), await get(abs.href, false));
    seen.set(raw, local);
  }
  css = css.replace(re, (all, q, raw) => (seen.has(raw) ? `url("${seen.get(raw)}")` : all));
  await writeFile(path.join(VENDOR, outName), css);
  console.log(`  css  ${outName} (+${seen.size} fail)`);
}

async function vendorJs(url, outName) {
  await writeFile(path.join(VENDOR, outName), await get(url));
  console.log(`  js   ${outName}`);
}

const LIBS = [
  { find: 'https://cdn.tailwindcss.com', local: 'vendor/tailwind.js', type: 'js' },
  { find: 'https://cdn.jsdelivr.net/npm/chart.js@4', local: 'vendor/chart.js', type: 'js', match: 'https://cdn.jsdelivr.net/npm/chart.js"' },
  { find: 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2', local: 'vendor/chartjs-datalabels.js', type: 'js' },
  { find: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', local: 'vendor/poppins.css', type: 'css' },
  { find: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', local: 'vendor/fontawesome.css', type: 'css' }
];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await cp(SRC, OUT, { recursive: true });
  await mkdir(VENDOR, { recursive: true });

  let html = await readFile(path.join(OUT, 'index.html'), 'utf8');
  console.log('Muat turun library CDN:');
  for (const lib of LIBS) {
    const outName = path.basename(lib.local);
    if (lib.type === 'js') await vendorJs(lib.find, outName);
    else await vendorCss(lib.find, outName);

    // Ganti URL CDN dalam HTML dengan fail tempatan
    if (lib.match) {
      if (!html.includes(lib.match)) throw new Error(`Tak jumpa ${lib.match} dalam index.html`);
      html = html.split(lib.match).join(`${lib.local}"`);
    } else {
      if (!html.includes(lib.find)) throw new Error(`Tak jumpa ${lib.find} dalam index.html`);
      html = html.split(lib.find).join(lib.local);
    }
  }

  // Capacitor 8 (SystemBars) suntik --safe-area-inset-* yang tepat; WebView Android < 140
  // kadang beri nilai env() yang salah. Guna var() dulu, env() sebagai fallback.
  let safeCount = 0;
  html = html.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)(\s*,\s*[^()]*)?\)/g, (all, side, fb) => {
    safeCount++;
    return `var(--safe-area-inset-${side}, env(safe-area-inset-${side}${fb || ''}))`;
  });
  console.log(`  safe-area: ${safeCount} rujukan env() dikemas kini`);

  const leftover = html.match(/(src|href)=["']https?:\/\/[^"']+/g);
  if (leftover) console.warn('Amaran: masih ada rujukan luar:', leftover);

  await writeFile(path.join(OUT, 'index.html'), html);
  console.log('www/ siap.');
}

main().catch((e) => { console.error(e); process.exit(1); });
