/**
 * formatters.js
 * 日時・数値・テキストのフォーマッタ
 */

/**
 * 秒を MM:SS 形式に変換
 */
function formatSeconds(sec) {
  if (sec == null) return '00:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * ミリ秒を MM:SS.mmm 形式に変換
 */
function formatMilliseconds(ms) {
  if (ms == null) return '00:00.000';
  const totalSec = Math.floor(ms / 1000);
  const remainder = ms % 1000;
  return `${formatSeconds(totalSec)}.${String(remainder).padStart(3, '0')}`;
}

/**
 * 日付をローカル形式（例：2026-04-16）に変換
 */
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date; // 既に文字列の場合

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付と時刻をローカル形式に変換（例：2026-04-16 14:30:45）
 */
function formatDateTime(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;

  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * 日付を「YYYY年MM月DD日」形式に変換
 */
function formatDateJP(date) {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 温度を小数第1位で表示
 */
function formatTemperature(temp) {
  if (temp == null) return '—';
  return Number.isFinite(temp) ? temp.toFixed(1) : '—';
}

/**
 * RoR（Rate of Rise）をフォーマット
 */
function formatRoR(ror) {
  if (ror == null) return '—';
  if (!Number.isFinite(ror)) return '—';
  return (ror > 0 ? '+' : '') + ror.toFixed(1);
}

/**
 * 重量をフォーマット（g単位）
 */
function formatWeight(weight) {
  if (weight == null) return '—';
  return Number.isFinite(weight) ? `${weight.toFixed(1)}g` : '—';
}

/**
 * 数値を小数点以下N桁に丸める
 */
function roundTo(value, decimals) {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

/**
 * 百分率をフォーマット
 */
function formatPercent(value, decimals = 1) {
  if (!Number.isFinite(value)) return '—';
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * カンマ区切りで数値をフォーマット（例：1,234.56）
 */
function formatNumberWithComma(value) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * テーブルの行を表示用にフォーマット
 */
function formatTableRow(data, columns) {
  const row = {};
  columns.forEach(col => {
    if (col.formatter) {
      row[col.key] = col.formatter(data[col.key]);
    } else {
      row[col.key] = data[col.key];
    }
  });
  return row;
}

/**
 * 焙煎度ラベル（数値 → 文字列）
 * 例：1.0 → "ライト"
 */
function formatRoastLevelLabel(roastLevel) {
  const roastLevels = [
    { val: 1.0, label: 'ライト' },
    { val: 1.25, label: 'シナモン' },
    { val: 1.5, label: '浅煎り' },
    { val: 1.75, label: '中浅煎り' },
    { val: 2.0, label: '中煎り' },
    { val: 2.25, label: '中深煎り' },
    { val: 2.5, label: '深煎り' },
    { val: 2.8, label: 'イタリアン' },
  ];
  const found = roastLevels.find(r => Math.abs(r.val - roastLevel) < 0.01);
  return found ? found.label : roastLevel.toFixed(2);
}

/**
 * 時間差を人間が読める形式に変換
 * 例：3661秒 → "1時間1分1秒"
 */
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

  return parts.join('');
}

/**
 * 複数行テキストをHTML-safe に変換
 */
function formatTextForHTML(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}
