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

// アプリケーション初期化
function initializeApp() {
  console.log('🚀 Coffee Roasting Manager v1.1 initialized');

  // localStorage からデータを読み込む
  const savedState = loadFromStorage('appState');
  if (savedState) {
    console.log('📂 Loading saved state from localStorage...');
    window.appState.beans = savedState.beans || [];
    window.appState.roastRecords = savedState.roastRecords || [];
    window.appState.tasteRecords = savedState.tasteRecords || [];
    window.appState.master = savedState.master || {
      countries: [],
      processes: [],
      varieties: [],
      brews: [],
    };
  }

  // UI状態をリセット
  resetUIState();

  // オブザーバーを登録（自動保存）
  window.appState.subscribe((event, data) => {
    // 主要なイベントで自動保存
    if (
      event.startsWith('bean:') ||
      event.startsWith('roast:') ||
      event.startsWith('taste:') ||
      event.startsWith('master:')
    ) {
      saveAppState(window.appState);
    }
  });

  console.log('✅ App initialized successfully');
}

/**
 * UI状態をリセット
 */
function resetUIState() {
  window.appState.ui.activeTab = 'beans';
  window.appState.ui.beanForm = {
    countryId: null,
    processIds: [],
    roastLevelVals: [],
    varietyIds: [],
  };
  window.appState.ui.filterPanel = {
    open: false,
    countryIds: [],
    roastLevelVals: [],
    year: null,
    month: null,
  };
}

/**
 * アプリケーションを終了
 */
function shutdownApp() {
  console.log('🛑 Shutting down app...');
  saveAppState(window.appState);

  // オブザーバーをクリア
  window.appState.observers = [];

  console.log('👋 App shut down');
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// ページ離脱時にデータを保存
window.addEventListener('beforeunload', shutdownApp);

// 開発用デバッグオブジェクト
window.__DEBUG__ = {
  appState: window.appState,
  beanService: window.beanService,
  masterDataService: window.masterDataService,

  // デバッグ用ヘルパー
  printState() {
    console.table({
      beans: window.appState.beans.length,
      roastRecords: window.appState.roastRecords.length,
      tasteRecords: window.appState.tasteRecords.length,
      countries: window.appState.master.countries.length,
      processes: window.appState.master.processes.length,
      varieties: window.appState.master.varieties.length,
    });
  },

  exportState() {
    return JSON.stringify({
      beans: window.appState.beans,
      roastRecords: window.appState.roastRecords,
      tasteRecords: window.appState.tasteRecords,
      master: window.appState.master,
    }, null, 2);
  },

  importState(jsonString) {
    const data = JSON.parse(jsonString);
    window.appState.beans = data.beans;
    window.appState.roastRecords = data.roastRecords;
    window.appState.tasteRecords = data.tasteRecords;
    window.appState.master = data.master;
    console.log('✅ State imported');
  },

  createTestData() {
    // テスト用データを生成
    const countries = [
      { id: 1, name: 'Ethiopia', enabled: true },
      { id: 2, name: 'Kenya', enabled: true },
      { id: 3, name: 'Costa Rica', enabled: true },
    ];
    window.appState.master.countries = countries;

    const processes = [
      { id: 101, name: 'Washed', enabled: true },
      { id: 102, name: 'Natural', enabled: true },
      { id: 103, name: 'Honey', enabled: true },
    ];
    window.appState.master.processes = processes;

    const varieties = [
      { id: 201, name: 'Bourbon', enabled: true },
      { id: 202, name: 'Typica', enabled: true },
      { id: 203, name: 'SL28', enabled: true },
    ];
    window.appState.master.varieties = varieties;

    console.log('✅ Test data created');
  },
};

console.log(
  '%c🍵 Coffee Roasting Manager',
  'color: #d97706; font-size: 16px; font-weight: bold;'
);
console.log('%cVersion: 1.1', 'color: #8b6f4d;');
console.log(
  '%cDebug: Use window.__DEBUG__ to access app state and utilities',
  'color: #059669;'
);
