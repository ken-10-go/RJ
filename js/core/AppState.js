/**
 * AppState.js
 * アプリケーション全体の状態管理
 * グローバルオブジェクト S を置き換え
 */

class AppState {
  constructor() {
    // ビジネスロジックデータ
    this.beans = [];              // 豆マスタ
    this.roastRecords = [];       // 焙煎記録
    this.tasteRecords = [];       // テイスティング記録
    this.master = {
      countries: [],
      processes: [],
      varieties: [],
      brews: [],
    };

    // UI状態（フォーム入力等）
    this.ui = {
      activeTab: 'beans',
      beanForm: {
        countryId: null,
        processIds: [],
        roastLevelVals: [],
        varietyIds: [],
      },
      filterPanel: {
        open: false,
        countryIds: [],
        roastLevelVals: [],
        year: null,
        month: null,
      },
    };

    // 焙煎セッション中の状態
    this.roastSession = {
      active: false,
      currentRoast: null,
      timerInterval: null,
      tempData: [],
      timeData: [],
      events: [],
    };

    // Drive同期状態
    this.sync = {
      token: null,
      user: null,
      lastSync: null,
      tokenExpiry: null,
      driveBeansFid: null,
      driveRoastFid: null,
      driveTasteFid: null,
    };

    // Undo/Redo
    this.undoStack = [];
    this.undoMax = 5;

    // オブザーバー（UI更新リスナー）
    this.observers = [];
  }

  /**
   * 豆を追加
   */
  addBean(bean) {
    this.beans.push(bean);
    this.notifyObservers('bean:added', bean);
  }

  /**
   * 豆を更新
   */
  updateBean(id, updates) {
    const bean = this.beans.find(b => b.id === id);
    if (!bean) throw new Error(`Bean not found: ${id}`);
    Object.assign(bean, updates);
    this.notifyObservers('bean:updated', bean);
  }

  /**
   * 豆を削除
   */
  deleteBean(id) {
    const index = this.beans.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Bean not found: ${id}`);
    const deleted = this.beans.splice(index, 1)[0];
    this.notifyObservers('bean:deleted', deleted);
  }

  /**
   * 焙煎記録を追加
   */
  addRoastRecord(record) {
    this.roastRecords.push(record);
    this.notifyObservers('roast:added', record);
  }

  /**
   * 焙煎記録を更新
   */
  updateRoastRecord(id, updates) {
    const record = this.roastRecords.find(r => r.id === id);
    if (!record) throw new Error(`Roast record not found: ${id}`);
    Object.assign(record, updates);
    this.notifyObservers('roast:updated', record);
  }

  /**
   * 焙煎記録を削除
   */
  deleteRoastRecord(id) {
    const index = this.roastRecords.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`Roast record not found: ${id}`);
    const deleted = this.roastRecords.splice(index, 1)[0];
    this.notifyObservers('roast:deleted', deleted);
  }

  /**
   * 味わい記録を追加
   */
  addTasteRecord(record) {
    this.tasteRecords.push(record);
    this.notifyObservers('taste:added', record);
  }

  /**
   * 味わい記録を更新
   */
  updateTasteRecord(id, updates) {
    const record = this.tasteRecords.find(t => t.id === id);
    if (!record) throw new Error(`Taste record not found: ${id}`);
    Object.assign(record, updates);
    this.notifyObservers('taste:updated', record);
  }

  /**
   * 味わい記録を削除
   */
  deleteTasteRecord(id) {
    const index = this.tasteRecords.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Taste record not found: ${id}`);
    const deleted = this.tasteRecords.splice(index, 1)[0];
    this.notifyObservers('taste:deleted', deleted);
  }

  /**
   * マスターデータを追加/更新
   */
  setMasterData(type, items) {
    if (!['countries', 'processes', 'varieties', 'brews'].includes(type)) {
      throw new Error(`Unknown master data type: ${type}`);
    }
    this.master[type] = items;
    this.notifyObservers('master:updated', { type, items });
  }

  /**
   * UI状態を更新
   */
  setUI(path, value) {
    // path: 'activeTab', 'beanForm.countryId' など
    const keys = path.split('.');
    let obj = this.ui;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.notifyObservers('ui:updated', { path, value });
  }

  /**
   * 焙煎セッション開始
   */
  startRoastSession(roastData) {
    this.roastSession.active = true;
    this.roastSession.currentRoast = roastData;
    this.roastSession.tempData = [];
    this.roastSession.timeData = [];
    this.roastSession.events = [];
    this.notifyObservers('roast:sessionStarted', roastData);
  }

  /**
   * 焙煎セッション終了
   */
  endRoastSession() {
    this.roastSession.active = false;
    const record = this.roastSession.currentRoast;
    this.roastSession.currentRoast = null;
    this.notifyObservers('roast:sessionEnded', record);
  }

  /**
   * オブザーバーを登録
   */
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }

  /**
   * すべてのオブザーバーに通知
   */
  notifyObservers(event, data) {
    this.observers.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error(`Observer error for event ${event}:`, e);
      }
    });
  }

  /**
   * Undo用にスナップショットを保存
   */
  snapshot() {
    return {
      beans: JSON.parse(JSON.stringify(this.beans)),
      roastRecords: JSON.parse(JSON.stringify(this.roastRecords)),
      tasteRecords: JSON.parse(JSON.stringify(this.tasteRecords)),
      master: JSON.parse(JSON.stringify(this.master)),
    };
  }

  /**
   * スナップショットから復元
   */
  restore(snapshot) {
    this.beans = snapshot.beans;
    this.roastRecords = snapshot.roastRecords;
    this.tasteRecords = snapshot.tasteRecords;
    this.master = snapshot.master;
    this.notifyObservers('state:restored', snapshot);
  }
}

// グローバルに AppState インスタンスを公開
window.appState = new AppState();
