/**
 * js/index.js
 * モジュールの初期化とグローバルインスタンスの設定
 */

// AppState が既にロードされていることを確認
if (typeof window.appState === 'undefined') {
  console.error('AppState not loaded. Include AppState.js before this script.');
}

// Week 1: Core & Basic Services
if (typeof MasterDataService !== 'undefined') {
  window.masterDataService = new MasterDataService(window.appState);
}

if (typeof BeanService !== 'undefined') {
  window.beanService = new BeanService(window.appState, window.masterDataService);
}

// Week 2: Business Logic Services
if (typeof RoastService !== 'undefined') {
  window.roastService = new RoastService(window.appState, window.beanService);
}

if (typeof TasteService !== 'undefined') {
  window.tasteService = new TasteService(window.appState, window.roastService);
}

if (typeof OcrService !== 'undefined') {
  window.ocrService = new OcrService();
}

if (typeof GoogleDriveService !== 'undefined') {
  window.googleDriveService = new GoogleDriveService(window.appState);
}

console.log('✅ All services initialized');
console.log(
  '%c🍵 Coffee Roasting Manager v1.2',
  'color: #d97706; font-size: 16px; font-weight: bold;'
);
