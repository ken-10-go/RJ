/**
 * js/compat/StateCompat.js
 * グローバル変数 S と AppState のブリッジ層
 * 既存コードとの互換性を保ちながら Service層に移行
 */

/**
 * 既存の S オブジェクトを AppState に移行
 * このレイヤーにより、既存関数の変更を最小限に抑える
 */
class StateCompat {
  constructor(appState) {
    this.appState = appState;
    this.legacyS = null;
  }

  /**
   * 既存の S オブジェクトから AppState にデータを移行
   */
  migrateFromLegacy(legacyS) {
    this.legacyS = legacyS;

    // データをAppStateに移行
    this.appState.beans = legacyS.beans || [];
    this.appState.roastRecords = legacyS.roastRecords || [];
    this.appState.tasteRecords = legacyS.tasteRecords || [];
    this.appState.master = legacyS.master || {
      countries: [],
      processes: [],
      varieties: [],
      brews: [],
    };

    // UI状態を移行
    this.appState.ui.beanForm.countryId = legacyS.beanSelectedCountryId || null;
    this.appState.ui.beanForm.processIds = legacyS.beanSelectedProcessIds || [];
    this.appState.ui.beanForm.roastLevelVals = legacyS.beanSelectedRLVals || [];
    this.appState.ui.beanForm.varietyIds = legacyS.beanSelectedVarietyIds || [];

    this.appState.ui.filterPanel.open = legacyS.filterPanelOpen || false;
    this.appState.ui.filterPanel.countryIds = legacyS.filterCountryIds || [];
    this.appState.ui.filterPanel.roastLevelVals = legacyS.filterRLVals || [];
    this.appState.ui.filterPanel.year = legacyS.filterYear || null;
    this.appState.ui.filterPanel.month = legacyS.filterMonth || null;

    // 焙煎セッション状態を移行
    if (legacyS.currentRoast) {
      this.appState.roastSession.active = legacyS.roastRunning || false;
      this.appState.roastSession.currentRoast = legacyS.currentRoast;
      this.appState.roastSession.tempData = legacyS.tempData || [];
      this.appState.roastSession.timeData = legacyS.timeData || [];
      this.appState.roastSession.events = legacyS.events || [];
      this.appState.roastSession.timerInterval = legacyS.timerInterval;
    }

    // Drive状態を移行
    this.appState.sync.token = legacyS.driveToken || null;
    this.appState.sync.user = legacyS.driveUser || null;
    this.appState.sync.lastSync = legacyS.lastSync || null;
    this.appState.sync.tokenExpiry = legacyS.tokenExpiry || null;
    this.appState.sync.driveBeansFid = legacyS.driveBeansFid || null;
    this.appState.sync.driveRoastFid = legacyS.driveRoastFid || null;
    this.appState.sync.driveTasteFid = legacyS.driveTasteFid || null;

    console.log('✅ State migrated from legacy S to AppState');
  }

  /**
   * AppState の変更を legacy S に同期（逆方向）
   * 既存関数が S を参照している場合のために必要
   */
  syncToLegacy() {
    if (!this.legacyS) return;

    // 主要データを深くコピーして同期（参照ではなく値をコピー）
    this.legacyS.beans = JSON.parse(JSON.stringify(this.appState.beans));
    this.legacyS.roastRecords = JSON.parse(JSON.stringify(this.appState.roastRecords));
    this.legacyS.tasteRecords = JSON.parse(JSON.stringify(this.appState.tasteRecords));
    this.legacyS.master = JSON.parse(JSON.stringify(this.appState.master));

    // UI状態を同期
    this.legacyS.beanSelectedCountryId = this.appState.ui.beanForm.countryId;
    this.legacyS.beanSelectedProcessIds = this.appState.ui.beanForm.processIds;
    this.legacyS.beanSelectedRLVals = this.appState.ui.beanForm.roastLevelVals;
    this.legacyS.beanSelectedVarietyIds = this.appState.ui.beanForm.varietyIds;

    this.legacyS.filterPanelOpen = this.appState.ui.filterPanel.open;
    this.legacyS.filterCountryIds = this.appState.ui.filterPanel.countryIds;
    this.legacyS.filterRLVals = this.appState.ui.filterPanel.roastLevelVals;
    this.legacyS.filterYear = this.appState.ui.filterPanel.year;
    this.legacyS.filterMonth = this.appState.ui.filterPanel.month;

    // 焙煎セッション状態を同期
    this.legacyS.roastRunning = this.appState.roastSession.active;
    this.legacyS.currentRoast = this.appState.roastSession.currentRoast;
    this.legacyS.tempData = this.appState.roastSession.tempData;
    this.legacyS.timeData = this.appState.roastSession.timeData;
    this.legacyS.events = this.appState.roastSession.events;
    this.legacyS.timerInterval = this.appState.roastSession.timerInterval;

    // Drive状態を同期
    this.legacyS.driveToken = this.appState.sync.token;
    this.legacyS.driveUser = this.appState.sync.user;
    this.legacyS.lastSync = this.appState.sync.lastSync;
    this.legacyS.tokenExpiry = this.appState.sync.tokenExpiry;
    this.legacyS.driveBeansFid = this.appState.sync.driveBeansFid;
    this.legacyS.driveRoastFid = this.appState.sync.driveRoastFid;
    this.legacyS.driveTasteFid = this.appState.sync.driveTasteFid;
  }

  /**
   * AppState の変更を定期的に legacy S に同期
   */
  setupAutoSync(intervalMs = 500) {
    setInterval(() => {
      this.syncToLegacy();
    }, intervalMs);
  }

  /**
   * AppState オブザーバーを設定して UI 更新を自動化
   */
  setupUIObservers(updateCallbacks) {
    this.appState.subscribe((event, data) => {
      this.syncToLegacy();

      // イベント別のコールバック実行
      if (updateCallbacks[event]) {
        try {
          updateCallbacks[event](data);
        } catch (e) {
          console.error(`UI update error for event ${event}:`, e);
        }
      }

      // 汎用更新（主要イベント時）
      if (event.startsWith('bean:') || event.startsWith('roast:') || event.startsWith('taste:')) {
        if (updateCallbacks.onDataChanged) {
          updateCallbacks.onDataChanged(event, data);
        }
      }
    });
  }
}

// グローバルに StateCompat インスタンスを公開
window.stateCompat = null; // 後で初期化
