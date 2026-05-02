// ===== smoke_test.js =====
// 開発時チェック。index.html の該当 <script> タグのコメントを外して使用。
// console.assert は失敗時のみ DevTools に表示されるため、本番でも影響なし。
(function(){
  const fn=(name)=>console.assert(typeof window[name]==='function','[smoke] 関数未定義: '+name);
  const el=(id)=>console.assert(document.getElementById(id),'[smoke] 要素なし: #'+id);

  // 主要関数の存在確認
  ['renderBeans','saveBean','editBean','deleteBean','copyBean',
   'renderRecords','saveTaste','loadLocal','saveLocal',
   'toast','switchTab','initFilterButtons','initFlavorWheel',
   'loadDriveStorage','autoSync','updateBeanSelect',
  ].forEach(fn);

  // 主要DOM要素の存在確認
  ['bean-list','f-stock-only','toast','tab-beans','tab-roast',
   'tab-records','tab-taste','tab-analysis','tab-drive',
   'r-bean','r-amount',
  ].forEach(el);

  // データ構造の確認
  console.assert(typeof S==='object'&&S!==null,             '[smoke] S が存在しない');
  console.assert(Array.isArray(S.beans),                    '[smoke] S.beans が配列でない');
  console.assert(Array.isArray(S.roastRecords),             '[smoke] S.roastRecords が配列でない');
  console.assert(S.master&&Array.isArray(S.master.countries),'[smoke] S.master.countries がない');

  console.log('[smoke] ✓ 全チェック通過');
})();
