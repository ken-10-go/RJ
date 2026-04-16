/**
 * js/compat/StorageCompat.js
 * 既存の localStorage 操作を AppState 経由に統合
 */

/**
 * 既存の saveLocal を AppState 経由で実行
 */
function saveLocalCompat(appState) {
  const data = {
    version: 4,
    savedAt: new Date().toISOString(),
    master: appState.master,
    beans: appState.beans,
    roastRecords: appState.roastRecords,
    tasteRecords: appState.tasteRecords,
  };
  saveToStorage('appState', data);
}

/**
 * 既存の loadLocal を AppState 経由で実行
 */
function loadLocalCompat(appState) {
  const LS_KEY = 'rj_offline_data';
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);
    appState.beans = data.beans || [];
    appState.roastRecords = data.roastRecords || [];
    appState.tasteRecords = data.tasteRecords || [];
    appState.master = data.master || {
      countries: [],
      processes: [],
      varieties: [],
      brews: [],
    };

    console.log('✅ Data loaded from localStorage');
  } catch (e) {
    console.warn('Failed to load local data:', e);
  }
}

/**
 * 既存の autoSync を AppState 経由で実行
 */
function autoSyncCompat(appState, googleDriveService) {
  if (!appState.sync.token) {
    console.log('Drive not connected, using localStorage');
    saveLocalCompat(appState);
    return;
  }

  // Drive同期を非同期で実行（ブロックしない）
  if (googleDriveService) {
    googleDriveService
      .saveAllData(
        appState.beans,
        appState.roastRecords,
        appState.tasteRecords,
        appState.master
      )
      .then(() => {
        console.log('✅ Auto-synced to Drive');
      })
      .catch(e => {
        console.warn('Auto-sync to Drive failed:', e);
        // フォールバック: localStorage に保存
        saveLocalCompat(appState);
      });
  }
}

/**
 * 初期化時に localStorage から AppState にデータを復元
 */
function initializeAppStateFromStorage(appState) {
  loadLocalCompat(appState);
}

/**
 * Undo スタックを AppState 経由で管理
 */
class UndoStackCompat {
  constructor(appState, maxSize = 5) {
    this.appState = appState;
    this.maxSize = maxSize;
    this.stack = [];
  }

  /**
   * スナップショットをスタックに追加
   */
  push() {
    const snapshot = this.appState.snapshot();
    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  /**
   * 前の状態に戻す
   */
  undo() {
    if (this.stack.length === 0) {
      throw new Error('これ以上戻れません');
    }

    const snapshot = this.stack.pop();
    this.appState.restore(snapshot);

    // UI更新通知
    this.appState.notifyObservers('undo:restored', snapshot);
  }

  /**
   * スタックサイズを取得
   */
  getSize() {
    return this.stack.length;
  }

  /**
   * スタックをクリア
   */
  clear() {
    this.stack = [];
  }
}

// グローバル参照
window.undoStackCompat = null; // 後で初期化
