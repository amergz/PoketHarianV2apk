/* =========================================================
   Poket Harian - jambatan native (Capacitor)
   Hanya aktif bila app berjalan sebagai APK. Dalam browser biasa
   fail ini tidak buat apa-apa.
   ========================================================= */
(function () {
  'use strict';
  var C = window.Capacitor;
  var isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  window.PoketNative = { isNative: isNative };
  if (!isNative) return;

  var P = C.Plugins || {};
  document.documentElement.classList.add('is-native-app');

  // ---------- Warna ikon status bar ikut tema app ----------
  // Tema terang -> ikon gelap (LIGHT), tema gelap -> ikon putih (DARK)
  function syncBars() {
    if (!P.SystemBars || !P.SystemBars.setStyle) return;
    var dark = document.documentElement.classList.contains('dark');
    try {
      Promise.resolve(P.SystemBars.setStyle({ style: dark ? 'DARK' : 'LIGHT' })).catch(function () {});
    } catch (e) { /* abaikan */ }
  }
  syncBars();
  new MutationObserver(syncBars).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // ---------- Export backup ----------
  // <a download> tak berfungsi dalam WebView Android, jadi tulis fail guna
  // Filesystem, kemudian buka menu Share (Drive, WhatsApp, Telegram, Files...).
  async function shareFile(uri, fileName) {
    try {
      await P.Share.share({
        title: 'Backup Poket Harian',
        text: fileName,
        files: [uri],
        dialogTitle: 'Simpan / kongsi fail backup'
      });
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      if (!/cancel/i.test(msg)) throw e;
    }
  }

  async function saveBackup(fileName, text) {
    var Filesystem = P.Filesystem;
    if (!Filesystem || !P.Share) {
      alert('Plugin simpan fail tidak tersedia.');
      return;
    }
    // 1) Cuba simpan terus ke folder Documents/Poket Harian
    var savedPath = null;
    try {
      await Filesystem.writeFile({
        path: 'Poket Harian/' + fileName,
        data: text,
        directory: 'DOCUMENTS',
        encoding: 'utf8',
        recursive: true
      });
      savedPath = 'Documents/Poket Harian/' + fileName;
    } catch (e) {
      savedPath = null; // sesetengah versi Android tak benarkan, guna Share sahaja
    }

    try {
      if (savedPath) {
        var nak = confirm('Backup disimpan di:\n' + savedPath +
          '\n\nKongsi juga ke Google Drive / WhatsApp / Telegram untuk simpanan selamat?');
        if (!nak) return;
      }
      var res = await Filesystem.writeFile({
        path: fileName,
        data: text,
        directory: 'CACHE',
        encoding: 'utf8'
      });
      await shareFile(res.uri, fileName);
    } catch (e) {
      alert('Gagal export backup: ' + ((e && e.message) || e));
    }
  }
  window.PoketNative.saveBackup = saveBackup;

  // ---------- Butang Back Android ----------
  // Tutup modal paling atas dahulu, kemudian balik ke Home, baru keluar (minimize).
  var MODALS = [
    ['calculator-backdrop', 'toggleCalculator'],
    ['category-form-modal', 'closeCategoryFormModal'],
    ['debt-form-modal', 'closeDebtFormModal'],
    ['savings-modal', 'closeSavingsModal'],
    ['add-modal', 'closeAddModal'],
    ['bill-reminder-modal', 'closeBillReminderModal'],
    ['savings-goal-modal', 'closeSavingsGoalModal'],
    ['forecast-modal', 'closeForecastModal'],
    ['debt-plan-modal', 'closeDebtPlanModal'],
    ['category-modal', 'closeCategoryModal'],
    ['costing-modal', 'closeCostingModal']
  ];

  function isShown(el) {
    if (!el || el.classList.contains('hidden')) return false;
    return getComputedStyle(el).display !== 'none';
  }

  function topOpenModal() {
    var best = null, bestZ = -Infinity;
    MODALS.forEach(function (m, idx) {
      var el = document.getElementById(m[0]);
      if (!isShown(el) || typeof window[m[1]] !== 'function') return;
      var z = parseInt(getComputedStyle(el).zIndex, 10);
      if (isNaN(z)) z = 0;
      // z-index sama: utamakan yang lebih awal dalam senarai (modal borang di atas skrin penuh)
      var score = z * 100 - idx;
      if (score > bestZ) { bestZ = score; best = m; }
    });
    return best;
  }

  function currentTab() {
    var el = document.querySelector('.tab-content.active');
    return el ? el.id.replace(/^tab-/, '') : 'home';
  }

  if (P.App && P.App.addListener) {
    P.App.addListener('backButton', function () {
      var m = topOpenModal();
      if (m) { window[m[1]](); return; }
      if (currentTab() !== 'home' && typeof window.switchTab === 'function') {
        window.switchTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (P.App.minimizeApp) P.App.minimizeApp(); else P.App.exitApp();
    });
  }
})();
