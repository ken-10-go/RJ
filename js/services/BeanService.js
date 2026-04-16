/**
 * BeanService.js
 * 豆マスタの CRUD 操作とフィルタリング
 */

class BeanService {
  constructor(appState, masterDataService) {
    this.appState = appState;
    this.masterDataService = masterDataService;
  }

  /**
   * 豆を登録
   */
  registerBean(beanData) {
    // バリデーション
    const errors = validateBeanData(beanData);
    if (errors.length > 0) {
      throw new ValidationError('豆データが無効です', errors);
    }

    // ID とタイムスタンプを付与
    const bean = {
      id: beanData.id || Date.now(),
      name: beanData.name.trim(),
      countryId: beanData.countryId,
      country: beanData.country || null, // 旧形式互換性
      processIds: beanData.processIds || [],
      processes: beanData.processes || [], // 旧形式互換性
      varietyIds: beanData.varietyIds || [],
      varieties: beanData.varieties || [], // 旧形式互換性
      recommendedRoastLevel: beanData.recommendedRoastLevel || null,
      tasteNote: beanData.tasteNote || '',
      photoUrl: beanData.photoUrl || null,
      purchaseDate: beanData.purchaseDate || formatDate(new Date()),
      purchasedFrom: beanData.purchasedFrom || '',
      amount: beanData.amount || 0,
      createdAt: beanData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.appState.addBean(bean);
    return bean;
  }

  /**
   * 豆を更新
   */
  updateBean(id, updates) {
    const bean = this.getBeanById(id);
    if (!bean) throw new Error(`Bean not found: ${id}`);

    // バリデーション（更新時は部分的）
    if (updates.name && updates.name.trim() === '') {
      throw new ValidationError('豆の名前は必須です');
    }

    updates.updatedAt = new Date().toISOString();
    this.appState.updateBean(id, updates);
  }

  /**
   * 豆を削除
   */
  deleteBean(id) {
    this.appState.deleteBean(id);
  }

  /**
   * 豆を ID で取得
   */
  getBeanById(id) {
    return this.appState.beans.find(b => b.id === id);
  }

  /**
   * すべての豆を取得
   */
  getAllBeans() {
    return this.appState.beans;
  }

  /**
   * 豆一覧をフィルタリング
   */
  filterBeans(criteria) {
    let filtered = [...this.appState.beans];

    // 国でフィルタ
    if (criteria.countryIds && criteria.countryIds.length > 0) {
      filtered = filtered.filter(b => {
        // ID ベース
        if (b.countryId && criteria.countryIds.includes(b.countryId)) {
          return true;
        }
        // 旧形式互換性（country 文字列）
        if (b.country) {
          const countryId = this.masterDataService.getCountryByName(b.country)?.id;
          return countryId && criteria.countryIds.includes(countryId);
        }
        return false;
      });
    }

    // 焙煎度でフィルタ
    if (criteria.roastLevels && criteria.roastLevels.length > 0) {
      filtered = filtered.filter(b =>
        b.recommendedRoastLevel && criteria.roastLevels.includes(b.recommendedRoastLevel)
      );
    }

    // 購入年でフィルタ
    if (criteria.purchaseYear) {
      filtered = filtered.filter(b =>
        b.purchaseDate && b.purchaseDate.startsWith(criteria.purchaseYear)
      );
    }

    // 購入月でフィルタ
    if (criteria.purchaseMonth) {
      filtered = filtered.filter(b => {
        if (!b.purchaseDate) return false;
        const [year, month] = b.purchaseDate.split('-');
        return month === String(criteria.purchaseMonth).padStart(2, '0');
      });
    }

    // テキスト検索
    if (criteria.searchText) {
      const text = criteria.searchText.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(text) ||
        b.tasteNote.toLowerCase().includes(text) ||
        (b.country && b.country.toLowerCase().includes(text))
      );
    }

    return filtered;
  }

  /**
   * 豆を検索（名前）
   */
  searchBeansByName(name) {
    const text = name.toLowerCase();
    return this.appState.beans.filter(b =>
      b.name.toLowerCase().includes(text)
    );
  }

  /**
   * 国ごとの豆の個数を集計
   */
  countBeansByCountry() {
    const counts = {};
    this.appState.beans.forEach(bean => {
      const countryId = bean.countryId;
      counts[countryId] = (counts[countryId] || 0) + 1;
    });
    return counts;
  }

  /**
   * 焙煎度ごとの推奨豆を取得
   */
  getBeansByRecommendedRoastLevel(roastLevel) {
    return this.appState.beans.filter(b =>
      b.recommendedRoastLevel === roastLevel
    );
  }

  /**
   * 購入日で並び替え（新しい順）
   */
  sortBeansByPurchaseDate() {
    return [...this.appState.beans].sort((a, b) => {
      const dateA = new Date(a.purchaseDate || 0);
      const dateB = new Date(b.purchaseDate || 0);
      return dateB - dateA;
    });
  }

  /**
   * 豆の総数
   */
  getTotalBeanCount() {
    return this.appState.beans.length;
  }

  /**
   * 全豆の焙煎回数を集計
   */
  getTotalRoastCount() {
    return this.appState.roastRecords.length;
  }

  /**
   * 豆ごとの焙煎回数を集計
   */
  countRoastsByBean() {
    const counts = {};
    this.appState.roastRecords.forEach(record => {
      const beanId = record.beanId;
      counts[beanId] = (counts[beanId] || 0) + 1;
    });
    return counts;
  }

  /**
   * 豆の写真を更新
   */
  updateBeanPhoto(id, photoUrl) {
    this.updateBean(id, { photoUrl });
  }

  /**
   * 豆のテイストノートを更新
   */
  updateBeanTasteNote(id, tasteNote) {
    this.updateBean(id, { tasteNote });
  }

  /**
   * 豆の推奨焙煎度を更新
   */
  updateBeanRecommendedRoastLevel(id, roastLevel) {
    this.updateBean(id, { recommendedRoastLevel: roastLevel });
  }

  /**
   * 複数の豆を一括削除
   */
  deleteBeans(ids) {
    ids.forEach(id => this.deleteBean(id));
  }

  /**
   * 豆をインポート（CSV形式）
   */
  importBeansFromCSV(csvData) {
    // CSV パース処理（簡易版）
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const beans = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });

      try {
        const bean = this.registerBean({
          name: row.name,
          countryId: parseInt(row.countryId) || null,
          recommendedRoastLevel: parseFloat(row.recommendedRoastLevel) || null,
          tasteNote: row.tasteNote || '',
          purchaseDate: row.purchaseDate || formatDate(new Date()),
          purchasedFrom: row.purchasedFrom || '',
          amount: parseFloat(row.amount) || 0,
        });
        beans.push(bean);
      } catch (e) {
        console.warn(`Failed to import bean at row ${i}:`, e);
      }
    }

    return beans;
  }

  /**
   * 豆をエクスポート（CSV形式）
   */
  exportBeansToCSV() {
    const headers = [
      'id',
      'name',
      'countryId',
      'recommendedRoastLevel',
      'tasteNote',
      'purchaseDate',
      'purchasedFrom',
      'amount',
      'createdAt',
    ];

    return exportToCSV(this.appState.beans, headers);
  }
}

// グローバルに BeanService インスタンスを公開
window.beanService = null; // 後で初期化
