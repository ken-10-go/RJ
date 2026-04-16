/**
 * storage.js
 * localStorage操作ユーティリティ
 */

const STORAGE_PREFIX = 'coffeeRoast_';

/**
 * localStorage に JSON データを保存
 */
function saveToStorage(key, data) {
  try {
    const storageKey = STORAGE_PREFIX + key;
    const json = JSON.stringify(data);
    localStorage.setItem(storageKey, json);
    return true;
  } catch (e) {
    console.error(`Failed to save to localStorage: ${key}`, e);
    return false;
  }
}

/**
 * localStorage から JSON データを読み込む
 */
function loadFromStorage(key, defaultValue = null) {
  try {
    const storageKey = STORAGE_PREFIX + key;
    const json = localStorage.getItem(storageKey);
    if (json == null) return defaultValue;
    return JSON.parse(json);
  } catch (e) {
    console.error(`Failed to load from localStorage: ${key}`, e);
    return defaultValue;
  }
}

/**
 * localStorage から特定キーを削除
 */
function removeFromStorage(key) {
  try {
    const storageKey = STORAGE_PREFIX + key;
    localStorage.removeItem(storageKey);
    return true;
  } catch (e) {
    console.error(`Failed to remove from localStorage: ${key}`, e);
    return false;
  }
}

/**
 * localStorage をクリア（このアプリのキーのみ）
 */
function clearStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (e) {
    console.error('Failed to clear storage:', e);
    return false;
  }
}

/**
 * AppState 全体を保存
 */
function saveAppState(appState) {
  const data = {
    beans: appState.beans,
    roastRecords: appState.roastRecords,
    tasteRecords: appState.tasteRecords,
    master: appState.master,
    timestamp: new Date().toISOString(),
  };
  return saveToStorage('appState', data);
}

/**
 * AppState 全体を読み込む
 */
function loadAppState() {
  return loadFromStorage('appState', {
    beans: [],
    roastRecords: [],
    tasteRecords: [],
    master: { countries: [], processes: [], varieties: [], brews: [] },
    timestamp: null,
  });
}

/**
 * バックアップを作成（タイムスタンプ付き）
 */
function createBackup(appState) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupKey = `backup_${timestamp}`;
  const data = {
    beans: appState.beans,
    roastRecords: appState.roastRecords,
    tasteRecords: appState.tasteRecords,
    master: appState.master,
    createdAt: timestamp,
  };
  return saveToStorage(backupKey, data);
}

/**
 * バックアップの一覧を取得
 */
function listBackups() {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX + 'backup_')) {
      const cleanKey = key.substring(STORAGE_PREFIX.length);
      backups.push(cleanKey);
    }
  }
  return backups.sort().reverse(); // 新しい順
}

/**
 * バックアップから復元
 */
function restoreFromBackup(backupKey) {
  const fullKey = STORAGE_PREFIX + backupKey;
  const data = localStorage.getItem(fullKey);
  if (!data) {
    throw new Error(`Backup not found: ${backupKey}`);
  }
  return JSON.parse(data);
}

/**
 * バックアップを削除
 */
function deleteBackup(backupKey) {
  return removeFromStorage(backupKey);
}

/**
 * localStorage の使用状況を取得（概算）
 */
function getStorageUsage() {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);
      totalSize += (key.length + value.length) * 2; // 概算（バイト）
    }
  }
  return {
    bytes: totalSize,
    kilobytes: (totalSize / 1024).toFixed(2),
    megabytes: (totalSize / (1024 * 1024)).toFixed(3),
  };
}

/**
 * CSVをエクスポート用にフォーマット
 */
function exportToCSV(data, headers) {
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val == null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  return csv;
}

/**
 * JSON をエクスポート
 */
function exportToJSON(data) {
  return JSON.stringify(data, null, 2);
}
