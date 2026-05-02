// ===== init.js =====
// initOcrBox は削除済み関数だがINITから呼ばれているため空スタブで継続
function initOcrBox(){}

// ① window.onerror — 予期しない JS エラーをトーストで通知
window.onerror=function(msg,src,line,col,err){
  const loc=src?src.split('/').pop()+'#'+line:'';
  toast('⚠ エラー: '+(err&&err.message||msg)+(loc?' ('+loc+')':''),'error');
  return false; // false = ブラウザのデフォルト処理も維持
};
window.onunhandledrejection=function(e){
  toast('⚠ 非同期エラー: '+(e.reason&&e.reason.message||String(e.reason)),'error');
};

// ② safeCall — 1関数のエラーが init 全体を止めないようにする
function safeCall(fn,name){
  try{fn();}
  catch(e){console.error('[init] '+name+' failed:',e);toast('⚠ 初期化エラー ('+name+'): '+e.message,'error');}
}

// ===== INIT =====
loadDriveStorage();
loadMasterFileIds();
if(loadLocal()){console.log('Loaded from localStorage');migrateExistingData();migrateToPhase2();}
safeCall(renderBeanForm,    'renderBeanForm');
safeCall(initOcrBox,        'initOcrBox');
safeCall(initFilterButtons, 'initFilterButtons');
safeCall(initFlavorWheel,   'initFlavorWheel');
safeCall(renderBeans,       'renderBeans');
safeCall(updateUndoBtn,     'updateUndoBtn');
if(S.driveToken)loadFromDrive();
// OCRモードとGeminiキー状態を復元
setOcrMode(ocrMode);
loadGeminiKeyStatus();
// 自動チェックなし — バージョン表示タップで手動確認
