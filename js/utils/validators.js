/**
 * validators.js
 * 入力検証ユーティリティ
 */

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * 豆データのバリデーション
 */
function validateBeanData(data) {
  const errors = [];

  // 名前は必須
  if (!data.name || data.name.trim() === '') {
    errors.push('豆の名前は必須です');
  }

  // 国IDは必須
  if (!data.countryId) {
    errors.push('国を選択してください');
  }

  // 推奨焙煎度は数値
  if (data.recommendedRoastLevel && typeof data.recommendedRoastLevel !== 'number') {
    errors.push('推奨焙煎度は数値である必要があります');
  }

  // 精製方法は配列
  if (data.processIds && !Array.isArray(data.processIds)) {
    errors.push('精製方法は配列である必要があります');
  }

  // 品種は配列
  if (data.varietyIds && !Array.isArray(data.varietyIds)) {
    errors.push('品種は配列である必要があります');
  }

  return errors;
}

/**
 * 焙煎記録のバリデーション
 */
function validateRoastRecord(data) {
  const errors = [];

  // 豆IDは必須
  if (!data.beanId) {
    errors.push('豆を選択してください');
  }

  // 投入量は数値
  if (data.inputAmount && typeof data.inputAmount !== 'number') {
    errors.push('投入量は数値である必要があります');
  }

  // 温度データは配列
  if (data.tempData && !Array.isArray(data.tempData)) {
    errors.push('温度データは配列である必要があります');
  }

  // イベントは配列
  if (data.events && !Array.isArray(data.events)) {
    errors.push('イベントは配列である必要があります');
  }

  return errors;
}

/**
 * テイスティング記録のバリデーション
 */
function validateTasteRecord(data) {
  const errors = [];

  // 焙煎記録IDは必須
  if (!data.roastRecordId) {
    errors.push('焙煎記録を選択してください');
  }

  // スター評価は1-5
  if (data.stars && (data.stars < 1 || data.stars > 5)) {
    errors.push('スター評価は1-5の範囲です');
  }

  // レーダー値は0-5
  if (data.radarValues) {
    if (!Array.isArray(data.radarValues) || data.radarValues.length !== 6) {
      errors.push('レーダー値は6要素の配列である必要があります');
    }
    for (const val of data.radarValues) {
      if (typeof val !== 'number' || val < 0 || val > 5) {
        errors.push('レーダー値は0-5の範囲です');
      }
    }
  }

  return errors;
}

/**
 * マスターデータのバリデーション
 */
function validateMasterDataItem(type, data) {
  const errors = [];

  // 名前は必須
  if (!data.name || data.name.trim() === '') {
    errors.push(`${type}の名前は必須です`);
  }

  // IDは必須（新規でない場合）
  if (data.id && typeof data.id !== 'number') {
    errors.push('IDは数値である必要があります');
  }

  return errors;
}

/**
 * 日付文字列のバリデーション（YYYY-MM-DD形式）
 */
function validateDateString(dateStr) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateStr)) {
    return ['日付はYYYY-MM-DD形式である必要があります'];
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return ['無効な日付です'];
  }

  return [];
}

/**
 * 数値の範囲チェック
 */
function validateNumberRange(value, min, max, fieldName) {
  if (typeof value !== 'number') {
    return [`${fieldName}は数値である必要があります`];
  }
  if (value < min || value > max) {
    return [`${fieldName}は${min}から${max}の範囲である必要があります`];
  }
  return [];
}

/**
 * 配列の長さチェック
 */
function validateArrayLength(arr, minLength, maxLength, fieldName) {
  if (!Array.isArray(arr)) {
    return [`${fieldName}は配列である必要があります`];
  }
  if (arr.length < minLength) {
    return [`${fieldName}は最低${minLength}個の要素が必要です`];
  }
  if (maxLength && arr.length > maxLength) {
    return [`${fieldName}は最大${maxLength}個の要素までです`];
  }
  return [];
}
