/**
 * RoastService.js
 * 焙煎記録・イベント・温度データ・チャートの管理
 */

class RoastService {
  constructor(appState, beanService) {
    this.appState = appState;
    this.beanService = beanService;
  }

  /**
   * 焙煎を開始
   */
  startRoast(beanId, inputAmount, waterWash = false) {
    const bean = this.beanService.getBeanById(beanId);
    if (!bean) throw new Error(`Bean not found: ${beanId}`);

    const roastData = {
      id: Date.now(),
      beanId: beanId,
      beanName: bean.name,
      inputAmount: inputAmount,
      waterWash: waterWash,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      tempData: [],
      timeData: [],
      events: [],
      firstCrackTime: null,
      secondCrackTime: null,
      finalTemp: null,
      finalWeight: null,
      notes: '',
      rating: null,
    };

    this.appState.startRoastSession(roastData);
    return roastData;
  }

  /**
   * 温度を記録
   */
  recordTemperature(temp, elapsedTime) {
    if (!this.appState.roastSession.active) {
      throw new Error('焙煎セッションが開始されていません');
    }

    const tempNum = parseFloat(temp);
    if (!Number.isFinite(tempNum)) {
      throw new Error('温度は数値である必要があります');
    }

    const session = this.appState.roastSession;
    session.tempData.push(tempNum);
    session.timeData.push(elapsedTime);
    session.currentRoast.duration = elapsedTime;

    this.appState.notifyObservers('roast:temperatureRecorded', {
      temp: tempNum,
      time: elapsedTime,
      ror: this.calculateRoR(session.tempData),
    });
  }

  /**
   * イベントを記録（ハゼ、色変化など）
   */
  recordEvent(eventType, elapsedTime, temp = null, notes = '') {
    if (!this.appState.roastSession.active) {
      throw new Error('焙煎セッションが開始されていません');
    }

    const session = this.appState.roastSession;
    const event = {
      id: Date.now(),
      type: eventType, // 'first-crack', 'second-crack', 'color-change', 'custom'
      time: elapsedTime,
      temp: temp,
      notes: notes,
    };

    session.events.push(event);

    // ハゼのタイミングを記録
    if (eventType === 'first-crack' && !session.currentRoast.firstCrackTime) {
      session.currentRoast.firstCrackTime = elapsedTime;
    }
    if (eventType === 'second-crack' && !session.currentRoast.secondCrackTime) {
      session.currentRoast.secondCrackTime = elapsedTime;
    }

    this.appState.notifyObservers('roast:eventRecorded', event);
  }

  /**
   * 焙煎を終了
   */
  finishRoast(finalWeight, rating = null, notes = '') {
    if (!this.appState.roastSession.active) {
      throw new Error('焙煎セッションが開始されていません');
    }

    const session = this.appState.roastSession;
    const record = session.currentRoast;

    record.endTime = new Date().toISOString();
    record.finalWeight = finalWeight;
    record.finalTemp = session.tempData[session.tempData.length - 1] || null;
    record.rating = rating;
    record.notes = notes;

    this.appState.addRoastRecord(record);
    this.appState.endRoastSession();

    return record;
  }

  /**
   * 焙煎記録を取得
   */
  getRoastRecord(id) {
    return this.appState.roastRecords.find(r => r.id === id);
  }

  /**
   * すべての焙煎記録を取得
   */
  getAllRoastRecords() {
    return this.appState.roastRecords;
  }

  /**
   * 豆ごとの焙煎記録を取得
   */
  getRoastRecordsByBeanId(beanId) {
    return this.appState.roastRecords.filter(r => r.beanId === beanId);
  }

  /**
   * 焙煎記録を更新
   */
  updateRoastRecord(id, updates) {
    this.appState.updateRoastRecord(id, updates);
  }

  /**
   * 焙煎記録を削除
   */
  deleteRoastRecord(id) {
    this.appState.deleteRoastRecord(id);
  }

  /**
   * Rate of Rise (RoR) を計算
   */
  calculateRoR(tempData, intervalSeconds = 10) {
    if (tempData.length < 2) return null;

    const recentCount = Math.max(2, Math.floor(intervalSeconds / 1));
    const recent = tempData.slice(-recentCount);

    if (recent.length < 2) return null;

    const tempDiff = recent[recent.length - 1] - recent[0];
    const timeDiff = recent.length - 1; // 1秒間隔と仮定

    return tempDiff / timeDiff;
  }

  /**
   * 焙煎時間を計算
   */
  calculateRoastDuration(roastRecord) {
    if (!roastRecord.startTime || !roastRecord.endTime) return 0;
    const start = new Date(roastRecord.startTime);
    const end = new Date(roastRecord.endTime);
    return Math.floor((end - start) / 1000); // 秒
  }

  /**
   * 焙煎効率を計算（焙き上げ重量 / 投入量）
   */
  calculateRoastYield(roastRecord) {
    if (!roastRecord.inputAmount || !roastRecord.finalWeight) return 0;
    return (roastRecord.finalWeight / roastRecord.inputAmount) * 100;
  }

  /**
   * 複数焙煎の温度カーブを比較用にフォーマット
   */
  formatTemperatureCurves(roastIds) {
    const curves = roastIds.map(id => {
      const record = this.getRoastRecord(id);
      if (!record) return null;

      return {
        id: record.id,
        beanName: record.beanName,
        tempData: record.tempData,
        timeData: record.timeData,
        events: record.events,
      };
    }).filter(c => c !== null);

    return curves;
  }

  /**
   * 焙煎サマリーを取得
   */
  getRoastSummary(beanId = null) {
    const records = beanId
      ? this.getRoastRecordsByBeanId(beanId)
      : this.getAllRoastRecords();

    if (records.length === 0) {
      return {
        totalRoasts: 0,
        averageDuration: 0,
        averageYield: 0,
        highestTemp: null,
        lowestTemp: null,
      };
    }

    const durations = records.map(r => this.calculateRoastDuration(r));
    const yields = records.map(r => this.calculateRoastYield(r)).filter(y => y > 0);
    const allTemps = records.flatMap(r => r.tempData).filter(t => t > 0);

    return {
      totalRoasts: records.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      averageYield: yields.length > 0
        ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1)
        : 0,
      highestTemp: allTemps.length > 0 ? Math.max(...allTemps) : null,
      lowestTemp: allTemps.length > 0 ? Math.min(...allTemps) : null,
      firstCrackCount: records.filter(r => r.firstCrackTime).length,
      secondCrackCount: records.filter(r => r.secondCrackTime).length,
    };
  }

  /**
   * 焙煎イベントを抽出
   */
  getEventsByType(eventType, roastId = null) {
    const records = roastId
      ? [this.getRoastRecord(roastId)].filter(r => r !== null)
      : this.getAllRoastRecords();

    const events = [];
    records.forEach(record => {
      record.events.forEach(event => {
        if (event.type === eventType) {
          events.push({
            ...event,
            roastId: record.id,
            beanName: record.beanName,
          });
        }
      });
    });

    return events;
  }

  /**
   * 最近の焙煎記録を取得
   */
  getRecentRoasts(count = 10) {
    return [...this.appState.roastRecords]
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, count);
  }

  /**
   * 焙煎の統計情報を取得
   */
  getStatistics() {
    const records = this.getAllRoastRecords();

    if (records.length === 0) {
      return {
        totalRoasts: 0,
        uniqueBeans: 0,
        totalRoastTime: 0,
        averageRoastTime: 0,
      };
    }

    const uniqueBeans = new Set(records.map(r => r.beanId)).size;
    const totalTime = records.reduce((sum, r) => sum + this.calculateRoastDuration(r), 0);
    const averageTime = Math.round(totalTime / records.length);

    return {
      totalRoasts: records.length,
      uniqueBeans: uniqueBeans,
      totalRoastTime: totalTime,
      averageRoastTime: averageTime,
      averageTempRise: this.calculateAverageRoR(records),
    };
  }

  /**
   * 平均 RoR を計算
   */
  calculateAverageRoR(records) {
    const rors = records.map(r => this.calculateRoR(r.tempData)).filter(r => r !== null);
    if (rors.length === 0) return 0;
    return (rors.reduce((a, b) => a + b, 0) / rors.length).toFixed(1);
  }
}

// グローバルに RoastService インスタンスを公開
window.roastService = null; // 後で初期化
