# Poket Harian (APK Android)

Projek Capacitor 8 yang membungkus `web/index.html` menjadi APK Android.

## Cara dapatkan APK

1. Cipta repo baharu di GitHub (disyorkan **Private**), contohnya `poket-harian-android`.
2. Upload **semua** isi folder ini ke branch `main` (termasuk folder tersembunyi `.github/`).
3. Buka tab **Actions** > "Build APK Poket Harian". Ia berjalan sendiri selepas push
   (atau tekan **Run workflow**).
4. Bila siap (~5-8 minit), APK diterbitkan di halaman **Releases** repo
   (`https://github.com/<username>/<repo>/releases/latest`). Muat turun `PoketHarian.apk` terus.
   Salinan juga ada dalam **Artifacts** run tersebut.
5. Pindahkan ke telefon dan pasang (benarkan "Install unknown apps").

Run pertama akan menjana keystore dan commit ke `keystore/poket-harian.jks`.
**Jangan padam fail ini**, kerana semua update APK seterusnya perlu ditandatangan dengan
kunci yang sama. Kalau kunci bertukar, app lama perlu di-uninstall dan semua data akan hilang.

## Kemas kini app

Edit `web/index.html` dan push. Actions akan bina APK baharu dengan versionCode yang lebih tinggi,
jadi boleh terus install atas app lama tanpa kehilangan data.

## Struktur

| Fail | Fungsi |
|------|--------|
| `web/index.html` | App anda (dengan 3 patch kecil untuk APK) |
| `web/native.js` | Butang Back Android, export backup native, warna status bar |
| `scripts/build-www.mjs` | Salin `web/` ke `www/` dan muat turun Tailwind, Chart.js, FontAwesome, Poppins supaya app jalan offline |
| `scripts/patch-android.mjs` | Pasang ikon & splash Poket Harian |
| `android-res/` | Ikon launcher (biasa, bulat, adaptive) & splash |
| `.github/workflows/build-apk.yml` | Build + tandatangan APK |
