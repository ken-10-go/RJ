/**
 * TasteService.js
 * テイスティング記録・フレーバー分析・レーダーチャート
 */

class TasteService {
  constructor(appState, roastService) {
    this.appState = appState;
    this.roastService = roastService;
    this.radarLabels = [
      'Acidity',
      'Sweetness',
      'Body',
      'Bitterness',
      'Aftertaste',
      'Balance',
    ];
  }

  /**
   * テイスティング記録を追加
   */
  recordTaste(roastRecordId, tasteData) {
    const roastRecord = this.roastService.getRoastRecord(roastRecordId);
    if (!roastRecord) throw new Error(`Roast record not found: ${roastRecordId}`);

    // バリデーション
    const errors = validateTasteRecord({
      roastRecordId,
      ...tasteData,
    });
    if (errors.length > 0) {
      throw new ValidationError('テイスティングデータが無効です', errors);
    }

    const record = {
      id: tasteData.id || Date.now(),
      roastRecordId: roastRecordId,
      beanId: roastRecord.beanId,
      beanName: roastRecord.beanName,
      tastedAt: tasteData.tastedAt || formatDate(new Date()),
      stars: tasteData.stars || 0,
      radarValues: tasteData.radarValues || [0, 0, 0, 0, 0, 0],
      flavors: tasteData.flavors || [],
      notes: tasteData.notes || '',
      brewMethod: tasteData.brewMethod || '',
      beanAmount: tasteData.beanAmount || null,
      waterAmount: tasteData.waterAmount || null,
      waterTemp: tasteData.waterTemp || null,
      brewTime: tasteData.brewTime || null,
      grindSize: tasteData.grindSize || '',
      createdAt: tasteData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.appState.addTasteRecord(record);
    return record;
  }

  /**
   * テイスティング記録を取得
   */
  getTasteRecord(id) {
    return this.appState.tasteRecords.find(t => t.id === id);
  }

  /**
   * すべてのテイスティング記録を取得
   */
  getAllTasteRecords() {
    return this.appState.tasteRecords;
  }

  /**
   * 焙煎記録のテイスティング記録を取得
   */
  getTasteRecordsByRoastId(roastRecordId) {
    return this.appState.tasteRecords.filter(t => t.roastRecordId === roastRecordId);
  }

  /**
   * 豆のテイスティング記録を取得
   */
  getTasteRecordsByBeanId(beanId) {
    return this.appState.tasteRecords.filter(t => t.beanId === beanId);
  }

  /**
   * テイスティング記録を更新
   */
  updateTasteRecord(id, updates) {
    this.appState.updateTasteRecord(id, updates);
  }

  /**
   * テイスティング記録を削除
   */
  deleteTasteRecord(id) {
    this.appState.deleteTasteRecord(id);
  }

  /**
   * レーダーチャート用のデータを取得
   */
  getRadarData(roastRecordId) {
    const tasteRecords = this.getTasteRecordsByRoastId(roastRecordId);

    if (tasteRecords.length === 0) {
      return {
        labels: this.radarLabels,
        data: [0, 0, 0, 0, 0, 0],
      };
    }

    // 最新のテイスティング記録を使用
    const latestRecord = tasteRecords.sort((a, b) =>
      new Date(b.tastedAt) - new Date(a.tastedAt)
    )[0];

    return {
      labels: this.radarLabels,
      data: latestRecord.radarValues || [0, 0, 0, 0, 0, 0],
      record: latestRecord,
    };
  }

  /**
   * 複数焙煎のレーダーデータを比較用にフォーマット
   */
  compareRadarData(roastRecordIds) {
    return roastRecordIds.map(roastId => {
      const radarData = this.getRadarData(roastId);
      const roastRecord = this.roastService.getRoastRecord(roastId);
      return {
        label: roastRecord ? roastRecord.beanName : `Roast ${roastId}`,
        data: radarData.data,
      };
    });
  }

  /**
   * フレーバープロファイルを取得
   */
  getFlavorProfile(beanId) {
    const tasteRecords = this.getTasteRecordsByBeanId(beanId);

    if (tasteRecords.length === 0) {
      return { dominant: [], secondary: [], count: 0 };
    }

    const flavorCounts = {};
    tasteRecords.forEach(record => {
      (record.flavors || []).forEach(flavor => {
        flavorCounts[flavor] = (flavorCounts[flavor] || 0) + 1;
      });
    });

    const sorted = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1]);

    return {
      dominant: sorted.slice(0, 3).map(f => f[0]),
      secondary: sorted.slice(3, 6).map(f => f[0]),
      count: tasteRecords.length,
      allFlavors: flavorCounts,
    };
  }

  /**
   * 平均スター評価を取得
   */
  getAverageRating(beanId) {
    const tasteRecords = this.getTasteRecordsByBeanId(beanId);

    if (tasteRecords.length === 0) return 0;

    const totalStars = tasteRecords.reduce((sum, t) => sum + (t.stars || 0), 0);
    return (totalStars / tasteRecords.length).toFixed(1);
  }

  /**
   * レーダー値の平均を取得
   */
  getAverageRadarValues(beanId) {
    const tasteRecords = this.getTasteRecordsByBeanId(beanId);

    if (tasteRecords.length === 0) {
      return [0, 0, 0, 0, 0, 0];
    }

    const averageValues = [0, 0, 0, 0, 0, 0];
    tasteRecords.forEach(record => {
      (record.radarValues || []).forEach((val, idx) => {
        averageValues[idx] += val;
      });
    });

    return averageValues.map(val => (val / tasteRecords.length).toFixed(1));
  }

  /**
   * テイスティング統計を取得
   */
  getStatistics() {
    const records = this.getAllTasteRecords();

    if (records.length === 0) {
      return {
        totalRecords: 0,
        uniqueRoasts: 0,
        averageRating: 0,
      };
    }

    const uniqueRoasts = new Set(records.map(r => r.roastRecordId)).size;
    const averageRating = (
      records.reduce((sum, r) => sum + (r.stars || 0), 0) / records.length
    ).toFixed(1);

    return {
      totalRecords: records.length,
      uniqueRoasts: uniqueRoasts,
      averageRating: averageRating,
      highestRated: this.getHighestRatedRoasts(1)[0] || null,
    };
  }

  /**
   * 最高評価の焙煎を取得
   */
  getHighestRatedRoasts(count = 5) {
    return [...this.appState.tasteRecords]
      .sort((a, b) => (b.stars || 0) - (a.stars || 0))
      .slice(0, count);
  }

  /**
   * 最近のテイスティング記録を取得
   */
  getRecentTasteRecords(count = 10) {
    return [...this.appState.tasteRecords]
      .sort((a, b) => new Date(b.tastedAt) - new Date(a.tastedAt))
      .slice(0, count);
  }

  /**
   * 抽出パラメータの分析
   */
  analyzeBrewParameters(beanId) {
    const tasteRecords = this.getTasteRecordsByBeanId(beanId);

    if (tasteRecords.length === 0) {
      return {
        commonBrewMethods: [],
        averageWaterTemp: null,
        averageBewTime: null,
      };
    }

    const brewMethods = {};
    let totalWaterTemp = 0;
    let totalBrewTime = 0;
    let count = 0;

    tasteRecords.forEach(record => {
      if (record.brewMethod) {
        brewMethods[record.brewMethod] = (brewMethods[record.brewMethod] || 0) + 1;
      }
      if (record.waterTemp) totalWaterTemp += record.waterTemp;
      if (record.brewTime) totalBrewTime += record.brewTime;
      if (record.waterTemp || record.brewTime) count++;
    });

    return {
      commonBrewMethods: Object.entries(brewMethods)
        .sort((a, b) => b[1] - a[1])
        .map(([method, freq]) => ({ method, frequency: freq })),
      averageWaterTemp: count > 0 ? (totalWaterTemp / count).toFixed(1) : null,
      averageBrewTime: count > 0 ? (totalBrewTime / count).toFixed(1) : null,
    };
  }

  /**
   * 豆とレシピの相性を分析
   */
  analyzeBeanRecipeMatching(beanId) {
    const tasteRecords = this.getTasteRecordsByBeanId(beanId);

    if (tasteRecords.length < 2) {
      return { recommendations: [], patterns: [] };
    }

    // 最高評価とそのレシピを抽出
    const highestRated = tasteRecords.reduce((best, current) =>
      (current.stars || 0) > (best.stars || 0) ? current : best
    );

    const recommendations = [
      {
        parameter: '抽出方法',
        value: highestRated.brewMethod || '未記録',
        rating: highestRated.stars,
      },
      {
        parameter: '湯温',
        value: highestRated.waterTemp ? `${highestRated.waterTemp}°C` : '未記録',
        rating: highestRated.stars,
      },
      {
        parameter: '抽出時間',
        value: highestRated.brewTime ? `${highestRated.brewTime}秒` : '未記録',
        rating: highestRated.stars,
      },
    ];

    return {
      recommendations,
      bestRecord: highestRated,
    };
  }

  /**
   * テイスティングノートをフォーマット
   */
  formatTasteNote(tasteRecord) {
    const parts = [];

    if (tasteRecord.stars) {
      parts.push(`⭐ ${tasteRecord.stars}つ星`);
    }

    if (tasteRecord.flavors && tasteRecord.flavors.length > 0) {
      parts.push(`風味: ${tasteRecord.flavors.join(', ')}`);
    }

    if (tasteRecord.brewMethod) {
      parts.push(`抽出: ${tasteRecord.brewMethod}`);
    }

    if (tasteRecord.notes) {
      parts.push(`メモ: ${tasteRecord.notes}`);
    }

    return parts.join('\n');
  }
}

// グローバルに TasteService インスタンスを公開
window.tasteService = null; // 後で初期化
