/**
 * GoogleDriveService.js
 * Google Drive API・データ同期・マイグレーション
 * Phase 1 (roast_journal.json) と Phase 2 (beans.json等) の互換性対応
 */

class GoogleDriveService {
  constructor(appState) {
    this.appState = appState;
    this.clientId = null;
    this.tokenClient = null;
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * OAuth2 クライアントを初期化
   */
  async initializeOAuth(clientId) {
    this.clientId = clientId;
    return true; // 実装はユーザーの Google Script 設定に依存
  }

  /**
   * アクセストークンを取得
   */
  async getAccessToken() {
    const token = this.appState.sync.token;
    const expiry = this.appState.sync.tokenExpiry;

    if (!token) {
      throw new Error('Token not available');
    }

    // トークンが期限切れか確認
    if (expiry && new Date() > new Date(expiry)) {
      throw new Error('Token expired');
    }

    return token;
  }

  /**
   * トークンを設定
   */
  setToken(token, expirySeconds = 3600) {
    this.appState.sync.token = token;
    const expiryTime = new Date();
    expiryTime.setSeconds(expiryTime.getSeconds() + expirySeconds);
    this.appState.sync.tokenExpiry = expiryTime.toISOString();
  }

  /**
   * データ形式を自動判定（Phase 1 vs Phase 2）
   */
  async detectDataFormat() {
    try {
      const token = await this.getAccessToken();

      // Phase 2 ファイル（beans.json）の存在確認
      const beansFiles = await this.searchFiles(token, 'name="beans.json"');
      if (beansFiles.files && beansFiles.files.length > 0) {
        return 'phase2';
      }

      // Phase 1 ファイル（roast_journal.json）の存在確認
      const legacyFiles = await this.searchFiles(token, 'name="roast_journal.json"');
      if (legacyFiles.files && legacyFiles.files.length > 0) {
        return 'phase1';
      }

      return 'none'; // どのファイルも見つからない
    } catch (e) {
      console.error('Failed to detect data format:', e);
      return 'none';
    }
  }

  /**
   * すべてのデータを読み込む（形式を自動判定）
   */
  async loadAllData() {
    const format = await this.detectDataFormat();

    if (format === 'phase1') {
      return await this.loadPhase1Data();
    } else if (format === 'phase2') {
      return await this.loadPhase2Data();
    } else {
      return {
        beans: [],
        roastRecords: [],
        tasteRecords: [],
        master: { countries: [], processes: [], varieties: [], brews: [] },
      };
    }
  }

  /**
   * Phase 1 形式でデータを読み込む
   */
  async loadPhase1Data() {
    try {
      const token = await this.getAccessToken();
      const files = await this.searchFiles(token, 'name="roast_journal.json"');

      if (!files.files || files.files.length === 0) {
        throw new Error('Phase 1 file not found');
      }

      const fileId = files.files[0].id;
      const content = await this.readFile(token, fileId);
      const data = JSON.parse(content);

      // Phase 1 形式をアプリ内フォーマットに変換
      return this.convertPhase1ToInternal(data);
    } catch (e) {
      console.error('Failed to load Phase 1 data:', e);
      throw e;
    }
  }

  /**
   * Phase 2 形式でデータを読み込む
   */
  async loadPhase2Data() {
    try {
      const token = await this.getAccessToken();

      const beansData = await this.readJsonFile(token, 'beans.json');
      const roastData = await this.readJsonFile(token, 'roast_records.json');
      const tasteData = await this.readJsonFile(token, 'taste_records.json');

      return {
        beans: beansData?.beans || [],
        roastRecords: roastData?.roastRecords || [],
        tasteRecords: tasteData?.tasteRecords || [],
        master: {
          countries: [],
          processes: [],
          varieties: [],
          brews: [],
        },
      };
    } catch (e) {
      console.error('Failed to load Phase 2 data:', e);
      throw e;
    }
  }

  /**
   * すべてのデータを保存（Phase 2 形式）
   */
  async saveAllData(beans, roastRecords, tasteRecords, master) {
    try {
      const token = await this.getAccessToken();
      const timestamp = new Date().toISOString();

      // 3 つの JSON ファイルを並行保存
      await Promise.all([
        this.saveJsonFile(
          token,
          'beans.json',
          { version: 2, exportedAt: timestamp, beans }
        ),
        this.saveJsonFile(
          token,
          'roast_records.json',
          { version: 2, exportedAt: timestamp, roastRecords }
        ),
        this.saveJsonFile(
          token,
          'taste_records.json',
          { version: 2, exportedAt: timestamp, tasteRecords }
        ),
      ]);

      // マスターデータを CSV で保存
      await this.saveMasterDataAsCSV(token, master);

      this.appState.sync.lastSync = timestamp;
      return true;
    } catch (e) {
      console.error('Failed to save all data:', e);
      throw e;
    }
  }

  /**
   * JSON ファイルを読み込む
   */
  async readJsonFile(token, fileName) {
    try {
      const files = await this.searchFiles(token, `name="${fileName}"`);
      if (!files.files || files.files.length === 0) {
        return null;
      }

      const content = await this.readFile(token, files.files[0].id);
      return JSON.parse(content);
    } catch (e) {
      console.warn(`Failed to read ${fileName}:`, e);
      return null;
    }
  }

  /**
   * JSON ファイルを保存
   */
  async saveJsonFile(token, fileName, data) {
    const fileContent = JSON.stringify(data, null, 2);
    return await this.saveFile(token, fileName, fileContent, 'application/json');
  }

  /**
   * ファイルを検索
   */
  async searchFiles(token, query) {
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=10&fields=files(id,name,modifiedTime)`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search files: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * ファイルを読み込む
   */
  async readFile(token, fileId) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * ファイルを保存
   */
  async saveFile(token, fileName, content, mimeType) {
    // 既存ファイルを検索
    const files = await this.searchFiles(token, `name="${fileName}"`);

    if (files.files && files.files.length > 0) {
      // 更新
      return await this.updateFile(token, files.files[0].id, content, mimeType);
    } else {
      // 新規作成
      return await this.createFile(token, fileName, content, mimeType);
    }
  }

  /**
   * ファイルを作成
   */
  async createFile(token, fileName, content, mimeType) {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: mimeType,
    };

    const body = [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      content,
      closeDelimiter,
    ].join('');

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * ファイルを更新
   */
  async updateFile(token, fileId, content, mimeType) {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * マスターデータを CSV で保存
   */
  async saveMasterDataAsCSV(token, master) {
    // countries.csv, processes.csv, varieties.csv を保存
    const types = ['countries', 'processes', 'varieties'];

    for (const type of types) {
      const data = master[type] || [];
      const csv = this.convertToCSV(data, ['id', 'name', 'enabled']);
      await this.saveFile(token, `master_${type}.csv`, csv, 'text/csv');
    }
  }

  /**
   * データを CSV に変換
   */
  convertToCSV(data, headers) {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(item =>
      headers.map(h => {
        const val = item[h];
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Phase 1 形式を内部フォーマットに変換
   */
  convertPhase1ToInternal(phase1Data) {
    // Phase 1 は roast_journal という形式
    // これを beans, roastRecords, tasteRecords に分割
    const beans = [];
    const roastRecords = [];
    const tasteRecords = [];

    // 実装はアプリのデータ構造に応じてカスタマイズ
    // ここは簡易版
    if (phase1Data.beans) {
      beans.push(...phase1Data.beans);
    }

    if (phase1Data.roasts) {
      roastRecords.push(...phase1Data.roasts);
    }

    if (phase1Data.tastes) {
      tasteRecords.push(...phase1Data.tastes);
    }

    return {
      beans,
      roastRecords,
      tasteRecords,
      master: phase1Data.master || {
        countries: [],
        processes: [],
        varieties: [],
        brews: [],
      },
    };
  }

  /**
   * 同期状態を取得
   */
  getSyncStatus() {
    return {
      connected: !!this.appState.sync.token,
      lastSync: this.appState.sync.lastSync,
      user: this.appState.sync.user,
      tokenExpiry: this.appState.sync.tokenExpiry,
    };
  }

  /**
   * 同期をリセット
   */
  resetSync() {
    this.appState.sync.token = null;
    this.appState.sync.user = null;
    this.appState.sync.lastSync = null;
    this.appState.sync.tokenExpiry = null;
  }
}

// グローバルに GoogleDriveService インスタンスを公開
window.googleDriveService = null; // 後で初期化
