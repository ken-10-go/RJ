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
      country: beanData.country || null,
      processIds: beanData.processIds || [],
      processes: beanData.processes || [],
      varietyIds: beanData.varietyIds || [],
      varieties: beanData.varieties || [],
      roastLevelVals: beanData.roastLevelVals || [],
      roastLevels: beanData.roastLevels || [],
      farm: beanData.farm || '',
      shop: beanData.shop || '',
      amount: beanData.amount || 0,
      purchaseDate: beanData.purchaseDate || '',
      price: beanData.price || '',
      score: beanData.score || '',
      taste: beanData.taste || '',
      memo: beanData.memo || '',
      photo: beanData.photo || null,
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
      filtered = filtered.filter(b => {
        // ID ベース
        if (b.roastLevelVals && b.roastLevelVals.some(v => criteria.roastLevels.includes(v))) {
          return true;
        }
        // 旧形式互換性
        if (b.roastLevels && b.roastLevels.some(lbl => 
          criteria.roastLevels.some(v => lbl.startsWith(`[${v.toFixed(1)}]`))
        )) {
          return true;
        }
        return false;
      });
    }

    // 日付でフィルタ（年）
    if (criteria.year) {
      filtered = filtered.filter(b => b.purchaseDate && b.purchaseDate.startsWith(criteria.year));
    }

    // 日付でフィルタ（月）
    if (criteria.month) {
      filtered = filtered.filter(b => b.purchaseDate && b.purchaseDate.slice(5, 7) === criteria.month);
    }

    return filtered;
  }
}
