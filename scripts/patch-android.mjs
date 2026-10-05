// Dijalankan selepas `npx cap add android`.
// Ganti ikon & splash default Capacitor dengan ikon Poket Harian.
import { cp, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const MY_RES = path.join(ROOT, 'android-res');

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

async function main() {
  if (!(await exists(RES))) throw new Error('Folder android belum wujud. Jalankan `npx cap add android` dahulu.');

  // Buang splash.png Capacitor (drawable, drawable-land-*, drawable-port-*)
  for (const dir of await readdir(RES)) {
    if (!dir.startsWith('drawable')) continue;
    const f = path.join(RES, dir, 'splash.png');
    if (await exists(f)) await rm(f);
  }

  // Salin ikon launcher, warna latar adaptive icon & splash baharu
  await cp(MY_RES, RES, { recursive: true, force: true });
  console.log('Ikon & splash Poket Harian dipasang.');
}

main().catch((e) => { console.error(e); process.exit(1); });
