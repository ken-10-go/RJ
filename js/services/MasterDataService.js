/**
 * MasterDataService.js
 * マスターデータ（国、精製方法、品種、抽出方法）の管理
 */

class MasterDataService {
  constructor(appState) {
    this.appState = appState;
  }

  /**
   * 国データを取得
   */
  getCountries() {
    return this.appState.master.countries || [];
  }

  /**
   * 国を ID で検索
   */
  getCountryById(id) {
    return this.getCountries().find(c => c.id === id);
  }

  /**
   * 国を名前で検索
   */
  getCountryByName(name) {
    return this.getCountries().find(c => c.name === name);
  }

  /**
   * 国を追加
   */
  addCountry(countryData) {
    const errors = validateMasterDataItem('countries', countryData);
    if (errors.length > 0) {
      throw new ValidationError('国データが無効です', errors);
    }

    const country = {
      id: countryData.id || Date.now(),
      name: countryData.name,
      enabled: countryData.enabled !== false,
    };

    this.appState.master.countries.push(country);
    this.appState.notifyObservers('master:countriesUpdated', this.getCountries());
    return country;
  }

  /**
   * 国を更新
   */
  updateCountry(id, updates) {
    const country = this.getCountryById(id);
    if (!country) throw new Error(`Country not found: ${id}`);

    Object.assign(country, updates);
    this.appState.notifyObservers('master:countriesUpdated', this.getCountries());
  }

  /**
   * 国を削除
   */
  deleteCountry(id) {
    const index = this.appState.master.countries.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`Country not found: ${id}`);

    this.appState.master.countries.splice(index, 1);
    this.appState.notifyObservers('master:countriesUpdated', this.getCountries());
  }

  /**
   * 精製方法データを取得
   */
  getProcesses() {
    return this.appState.master.processes || [];
  }

  /**
   * 精製方法を ID で検索
   */
  getProcessById(id) {
    return this.getProcesses().find(p => p.id === id);
  }

  /**
   * 精製方法を追加
   */
  addProcess(processData) {
    const errors = validateMasterDataItem('processes', processData);
    if (errors.length > 0) {
      throw new ValidationError('精製方法データが無効です', errors);
    }

    const process = {
      id: processData.id || Date.now(),
      name: processData.name,
      enabled: processData.enabled !== false,
    };

    this.appState.master.processes.push(process);
    this.appState.notifyObservers('master:processesUpdated', this.getProcesses());
    return process;
  }

  /**
   * 精製方法を更新
   */
  updateProcess(id, updates) {
    const process = this.getProcessById(id);
    if (!process) throw new Error(`Process not found: ${id}`);

    Object.assign(process, updates);
    this.appState.notifyObservers('master:processesUpdated', this.getProcesses());
  }

  /**
   * 精製方法を削除
   */
  deleteProcess(id) {
    const index = this.appState.master.processes.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Process not found: ${id}`);

    this.appState.master.processes.splice(index, 1);
    this.appState.notifyObservers('master:processesUpdated', this.getProcesses());
  }

  /**
   * 品種データを取得
   */
  getVarieties() {
    return this.appState.master.varieties || [];
  }

  /**
   * 品種を ID で検索
   */
  getVarietyById(id) {
    return this.getVarieties().find(v => v.id === id);
  }

  /**
   * 品種を追加
   */
  addVariety(varietyData) {
    const errors = validateMasterDataItem('varieties', varietyData);
    if (errors.length > 0) {
      throw new ValidationError('品種データが無効です', errors);
    }

    const variety = {
      id: varietyData.id || Date.now(),
      name: varietyData.name,
      enabled: varietyData.enabled !== false,
    };

    this.appState.master.varieties.push(variety);
    this.appState.notifyObservers('master:varietiesUpdated', this.getVarieties());
    return variety;
  }

  /**
   * 品種を更新
   */
  updateVariety(id, updates) {
    const variety = this.getVarietyById(id);
    if (!variety) throw new Error(`Variety not found: ${id}`);

    Object.assign(variety, updates);
    this.appState.notifyObservers('master:varietiesUpdated', this.getVarieties());
  }

  /**
   * 品種を削除
   */
  deleteVariety(id) {
    const index = this.appState.master.varieties.findIndex(v => v.id === id);
    if (index === -1) throw new Error(`Variety not found: ${id}`);

    this.appState.master.varieties.splice(index, 1);
    this.appState.notifyObservers('master:varietiesUpdated', this.getVarieties());
  }

  /**
   * 抽出方法データを取得
   */
  getBrews() {
    return this.appState.master.brews || [];
  }

  /**
   * 抽出方法を追加
   */
  addBrew(brewName) {
    if (!brewName || typeof brewName !== 'string') {
      throw new Error('抽出方法は文字列である必要があります');
    }

    const brews = this.getBrews();
    if (!brews.includes(brewName)) {
      brews.push(brewName);
      this.appState.notifyObservers('master:brewsUpdated', brews);
    }
    return brewName;
  }

  /**
   * 抽出方法を削除
   */
  removeBrew(brewName) {
    const brews = this.getBrews();
    const index = brews.indexOf(brewName);
    if (index === -1) throw new Error(`Brew not found: ${brewName}`);

    brews.splice(index, 1);
    this.appState.notifyObservers('master:brewsUpdated', brews);
  }

  /**
   * すべてのマスターデータを取得
   */
  getAllMasterData() {
    return {
      countries: this.getCountries(),
      processes: this.getProcesses(),
      varieties: this.getVarieties(),
      brews: this.getBrews(),
    };
  }

  /**
   * すべてのマスターデータを設定（ローディング用）
   */
  setAllMasterData(masterData) {
    if (masterData.countries) {
      this.appState.master.countries = masterData.countries;
    }
    if (masterData.processes) {
      this.appState.master.processes = masterData.processes;
    }
    if (masterData.varieties) {
      this.appState.master.varieties = masterData.varieties;
    }
    if (masterData.brews) {
      this.appState.master.brews = masterData.brews;
    }
    this.appState.notifyObservers('master:allUpdated', this.getAllMasterData());
  }

  /**
   * 有効なアイテムのみをフィルタ
   */
  getEnabledCountries() {
    return this.getCountries().filter(c => c.enabled !== false);
  }

  getEnabledProcesses() {
    return this.getProcesses().filter(p => p.enabled !== false);
  }

  getEnabledVarieties() {
    return this.getVarieties().filter(v => v.enabled !== false);
  }
}

// グローバルに MasterDataService インスタンスを公開
window.masterDataService = null; // 後で AppState の後に初期化
