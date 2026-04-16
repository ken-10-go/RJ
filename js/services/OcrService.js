/**
 * OcrService.js
 * 温度計OCR・7セグメント認識・座標計算
 */

class OcrService {
  constructor() {
    this.debugMode = false;
    this.ocrMode = 'manual'; // 'manual' or 'gemini'
    this.geminiApiKey = null;

    // 7セグメント定義
    this.segments = {
      top: { id: 0, pos: [0, 0, 1, 0] },
      topRight: { id: 1, pos: [1, 0, 1, 1] },
      bottomRight: { id: 2, pos: [1, 1, 1, 2] },
      bottom: { id: 3, pos: [0, 2, 1, 2] },
      bottomLeft: { id: 4, pos: [0, 1, 0, 2] },
      topLeft: { id: 5, pos: [0, 0, 0, 1] },
      middle: { id: 6, pos: [0, 1, 1, 1] },
    };

    // 数字のセグメントパターン
    this.digitPatterns = {
      '0': [0, 1, 2, 3, 4, 5, 0],
      '1': [1, 2, 0, 0, 0, 0, 0],
      '2': [0, 1, 3, 4, 6, 0, 0],
      '3': [0, 1, 6, 2, 3, 0, 0],
      '4': [5, 6, 1, 2, 0, 0, 0],
      '5': [0, 5, 6, 2, 3, 0, 0],
      '6': [0, 5, 6, 4, 3, 2, 0],
      '7': [0, 1, 2, 0, 0, 0, 0],
      '8': [0, 1, 2, 3, 4, 5, 6],
      '9': [0, 1, 6, 2, 3, 5, 0],
    };
  }

  /**
   * Gemini API キーを設定
   */
  setGeminiApiKey(key) {
    this.geminiApiKey = key;
    if (key) {
      this.ocrMode = 'gemini';
    } else {
      this.ocrMode = 'manual';
    }
  }

  /**
   * Gemini Vision API で温度を認識
   */
  async recognizeWithGemini(imageData) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API キーが設定されていません');
    }

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: '画像に映っている温度計の数値を認識してください。小数点を含めて、数値のみを返してください。',
                },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: imageData.split(',')[1] || imageData, // Base64データ
                  },
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
      }

      const tempStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const temp = parseFloat(tempStr.match(/[\d.]+/)?.[0]);

      if (!Number.isFinite(temp)) {
        throw new Error(`Temperature not found in response: ${tempStr}`);
      }

      return {
        temperature: temp,
        confidence: 0.8,
        source: 'gemini',
      };
    } catch (e) {
      console.error('Gemini OCR error:', e);
      throw e;
    }
  }

  /**
   * キャンバスから7セグメント領域を検出
   */
  getDigitRectsForCanvas(canvasWidth, canvasHeight) {
    // キャンバスサイズに基づいて7セグメント領域を計算
    // 温度計表示域（例：204x150px）を想定
    const digitWidth = Math.floor(canvasWidth / 4);
    const digitHeight = Math.floor(canvasHeight * 0.8);
    const startX = Math.floor(canvasWidth * 0.05);
    const startY = Math.floor(canvasHeight * 0.1);

    return [
      { digit: 0, rect: [startX, startY, digitWidth, digitHeight] }, // 十の位
      { digit: 1, rect: [startX + digitWidth, startY, digitWidth, digitHeight] }, // 一の位
      { digit: 2, rect: [startX + digitWidth * 2.2, startY, digitWidth, digitHeight] }, // 小数第1位
    ];
  }

  /**
   * キャンバスの画像を7セグメント認識
   */
  recognizeFromCanvas(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // デバッグ画像処理
      if (this.debugMode) {
        this.debugImageProcessing(imageData);
      }

      // 7セグメント領域を検出
      const digitRects = this.getDigitRectsForCanvas(canvas.width, canvas.height);

      // 各桁を認識
      const digits = digitRects.map(({ digit, rect }) => {
        const [x, y, w, h] = rect;
        const digitImageData = ctx.getImageData(x, y, w, h);
        return this.recognizeDigit(digitImageData);
      });

      return digits.join('');
    } catch (e) {
      console.error('Canvas OCR error:', e);
      throw e;
    }
  }

  /**
   * 単一の7セグメント数字を認識
   */
  recognizeDigit(imageData) {
    // 簡易的なセグメント検出（実装はプレースホルダー）
    // 実際には画像処理で各セグメントの状態を判定

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // 白い領域の割合を計算
    let whiteCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 128) whiteCount++;
    }

    // 簡易マッチング（実装は簡略版）
    const whiteRatio = whiteCount / (width * height);

    // この比率に基づいて数字を推測
    if (whiteRatio > 0.7) return '1';
    if (whiteRatio > 0.5) return '8';
    if (whiteRatio > 0.3) return '2';

    return '0'; // デフォルト
  }

  /**
   * 複数の候補の中から最も可能性が高いものを選択
   */
  selectBestCandidate(candidates) {
    if (candidates.length === 0) return null;

    return candidates.reduce((best, current) =>
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );
  }

  /**
   * デバッグ用：画像処理プレビューを生成
   */
  debugImageProcessing(imageData) {
    // グレースケール変換
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    console.log('Debug: Image grayscale conversion completed');
    return imageData;
  }

  /**
   * 温度の妥当性チェック
   */
  validateTemperature(temp) {
    // コーヒー焙煎の温度範囲：40°C ～ 250°C
    if (!Number.isFinite(temp)) return false;
    return temp >= 40 && temp <= 250;
  }

  /**
   * 認識結果をフォーマット
   */
  formatTemperatureResult(result) {
    if (!result) return '—';
    const temp = parseFloat(result.temperature);
    if (!Number.isFinite(temp)) return '—';
    return temp.toFixed(1);
  }

  /**
   * OCRモードを切り替え
   */
  setOcrMode(mode) {
    if (['manual', 'gemini'].includes(mode)) {
      this.ocrMode = mode;
    }
  }

  /**
   * デバッグモードを切り替え
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

// グローバルに OcrService インスタンスを公開
window.ocrService = null; // 後で初期化
