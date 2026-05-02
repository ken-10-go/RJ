// ================================================================
// ui.js — ナビ・トースト・モーダル・マルチセレクト・フィルタ UI
// ================================================================
// Undo       : pushUndo, undo, updateUndoBtn
// Nav        : switchTab, closeAllDropdowns
// Modal      : initModalSwipe, toast
// Helpers    : rlLabel, rlFromEvents
// MultiSelect: toggleMsDropdown, renderMultiSelectList,
//              renderMultiSelectTags, toggleMultiSelectItem
// Bean form  : renderBeanForm, renderCountryDropdown, selectCountry,
//              addCountry, getSelectedCountry, renderProcessDropdown,
//              toggleBeanProcessMs, addProcess, renderRLDropdown,
//              toggleBeanRLMs, renderVarietyDropdown, toggleVariety,
//              addVarietyOption
// Filter     : toggleFilterPanel, updateFilterBadges, initFilterButtons,
//              setYearFilter, setMonthFilter, toggleCountryFilter,
//              toggleRLFilter, setCountryFilter, setRLFilter
// Brew       : initBrewSelect, onBrewSel, addBrew, getSelectedBrew
// Misc       : changeQty
// ================================================================

// ===== UNDO STACK (5回分) =====
const UNDO_STACK=[];
const UNDO_MAX=5;
function pushUndo(){
  UNDO_STACK.push({
    beans:JSON.parse(JSON.stringify(S.beans)),
    roastRecords:JSON.parse(JSON.stringify(S.roastRecords)),
    tasteRecords:JSON.parse(JSON.stringify(S.tasteRecords)),
    master:JSON.parse(JSON.stringify(S.master)),
  });
  if(UNDO_STACK.length>UNDO_MAX)UNDO_STACK.shift();
  updateUndoBtn();
}
function undo(){
  if(!UNDO_STACK.length){toast('これ以上戻れません');return;}
  const prev=UNDO_STACK.pop();
  S.beans=prev.beans;S.roastRecords=prev.roastRecords;S.tasteRecords=prev.tasteRecords;S.master=prev.master;
  renderBeans();updateBeanSelect();renderRecords();updateTasteSelect();
  updateUndoBtn();
  toast('元に戻しました（残り'+UNDO_STACK.length+'回）');
  autoSync();
}
function updateUndoBtn(){
  const btn=document.getElementById('undo-btn');
  if(!btn)return;
  btn.textContent='< UNDO'+(UNDO_STACK.length?' ('+UNDO_STACK.length+')'  :'');
  btn.style.opacity=UNDO_STACK.length?'1':'0.4';
}
let activeMultiSelect=null;

// ===== NAV =====
function switchTab(t){
  const names=['beans','roast','records','taste','analysis','drive'];
  document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',names[i]===t));
  const prev=document.querySelector('.section.active');
  if(prev)prev.classList.remove('active');
  const next=document.getElementById('tab-'+t);
  // フェードイン
  next.style.opacity='0';next.style.transform='translateY(8px)';
  next.classList.add('active');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{next.style.opacity='';next.style.transform='';}));
  if(t==='records')renderRecords();
  if(t==='analysis')renderAnalysis();
  if(t==='roast'){updateBeanSelect();updateRoastLevelHint();}
  if(t==='taste'){updateTasteSelect();renderRadarChart();renderRadarSliders();}
  if(t==='drive')updateDriveUI();
  if(t==='beans'){renderBeanForm();initFilterButtons();renderBeans();}
  closeAllDropdowns();
}
// ===== MODAL SWIPE TO CLOSE =====
function initModalSwipe(overlayId,closeFn){
  const overlay=document.getElementById(overlayId);
  if(!overlay)return;
  const modal=overlay.querySelector('.modal');
  if(!modal)return;
  let startY=0,currentY=0,dragging=false;
  const onStart=e=>{const t=e.touches?e.touches[0]:e;startY=t.clientY;dragging=true;modal.style.transition='none';};
  const onMove=e=>{if(!dragging)return;const t=e.touches?e.touches[0]:e;currentY=t.clientY;const dy=Math.max(0,currentY-startY);modal.style.transform=`translateY(${dy}px)`;};
  const onEnd=()=>{if(!dragging)return;dragging=false;modal.style.transition='';const dy=currentY-startY;if(dy>80){modal.style.transform='translateY(100%)';setTimeout(()=>{modal.style.transform='';closeFn();},200);}else{modal.style.transform='';}};
  modal.addEventListener('touchstart',onStart,{passive:true});
  modal.addEventListener('touchmove',onMove,{passive:true});
  modal.addEventListener('touchend',onEnd);
}
function toast(msg,type){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.style.background=type==='error'?'#b91c1c':'';
  el.style.opacity='1';
  setTimeout(()=>{el.style.opacity='0';},type==='error'?5000:2400);
}
function rlLabel(val){const r=ROAST_LEVELS.find(r=>r.val===val);return r?'['+val.toFixed(1)+'] '+r.ja:val.toFixed(1);}
function rlFromEvents(events){if(!events||!events.length)return null;const last=[...events].reverse().find(e=>e.rlVal!=null);return last?last.rlVal:null;}

// ===== MULTI-SELECT DROPDOWN =====
function toggleMsDropdown(id){
  const dd=document.getElementById(id+'-dropdown');
  const box=document.getElementById(id+'-box');
  const isOpen=dd.classList.contains('open');
  closeAllDropdowns();
  if(!isOpen){dd.classList.add('open');box.classList.add('open');activeMultiSelect=id;}
}
function closeAllDropdowns(){
  document.querySelectorAll('.multi-select-dropdown.open').forEach(el=>el.classList.remove('open'));
  document.querySelectorAll('.multi-select-box.open').forEach(el=>el.classList.remove('open'));
  activeMultiSelect=null;
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.multi-select-wrap'))closeAllDropdowns();
});
// ===== MULTI-SELECT 共有関数（重複排除） =====
// 複数選択ドロップダウンの items 一覧を統一的に描画
function renderMultiSelectList(itemsElementId, items, selectedArray, toggleFunc, enabledKey = 'enabled', textKey = 'name', idKey = 'id', getDisplayFunc = null) {
  const itemsEl = document.getElementById(itemsElementId);
  if(!itemsEl) return;
  itemsEl.innerHTML = (items || [])
    .filter(r => r[enabledKey] !== false)
    .map(item => {
      const id = item[idKey];
      const text = getDisplayFunc ? getDisplayFunc(id) : item[textKey];
      const isSelected = selectedArray.includes(id);
      return `<div class="ms-item${isSelected ? ' selected' : ''}" onclick="${toggleFunc}(${typeof id === 'number' ? id : "'" + id + "'"})">
        <div class="ms-check">${isSelected ? '✓' : ''}</div>
        <span>${text}</span>
      </div>`;
    }).join('');
}

// 複数選択ドロップダウンの tags（選択済みアイテム）を統一的に描画
function renderMultiSelectTags(boxElementId, placeholderElementId, selectedArray, items, toggleFunc, emptyLabel, textKey = 'name', idKey = 'id', getNameFunc = null) {
  const box = document.getElementById(boxElementId);
  const ph = document.getElementById(placeholderElementId);
  if(!box || !ph) return;

  box.querySelectorAll('.ms-tag').forEach(t => t.remove());

  if(selectedArray.length === 0) {
    ph.style.display = '';
    ph.textContent = emptyLabel;
  } else {
    ph.style.display = 'none';
    selectedArray.forEach(id => {
      let name = '';
      if(getNameFunc) {
        name = getNameFunc(id);
      } else {
        const item = items.find(i => i[idKey] === id);
        name = item ? item[textKey] : '';
      }
      const tag = document.createElement('span');
      tag.className = 'ms-tag';
      tag.innerHTML = `${name}<button class="ms-tag-x" onclick="event.stopPropagation();${toggleFunc}(${typeof id === 'number' ? id : "'" + id + "'"})">×</button>`;
      box.insertBefore(tag, ph);
    });
  }
}

// 複数選択の切り替え（ID配列 or 数値配列対応）
function toggleMultiSelectItem(stateArray, itemId, shouldParseFloat = false) {
  const val = shouldParseFloat ? parseFloat(itemId) : itemId;
  if(stateArray.includes(val)) {
    return stateArray.filter(x => x !== val);
  } else {
    stateArray.push(val);
    return stateArray;
  }
}

// --- 品種（複数選択・ID管理）---
function renderVarietyDropdown(){
  renderMultiSelectList('variety-items', S.master.varieties, S.beanSelectedVarietyIds, 'toggleVariety', 'enabled', 'name', 'id');
  renderMultiSelectTags('variety-box', 'variety-placeholder', S.beanSelectedVarietyIds, S.master.varieties, 'toggleVariety', '品種を選択...', 'name', 'id');
}
function toggleVariety(id){
  if(S.beanSelectedVarietyIds.includes(id))S.beanSelectedVarietyIds=S.beanSelectedVarietyIds.filter(x=>x!==id);
  else S.beanSelectedVarietyIds.push(id);
  renderVarietyDropdown();
}
function addVarietyOption(){
  const inp=document.getElementById('variety-add-inp');
  const v=inp.value.trim();if(!v)return;
  let row=S.master.varieties.find(r=>r.name===v&&r.enabled!==false);
  if(!row){row={id:Date.now(),name:v,enabled:true};S.master.varieties.push(row);masterDirtyTypes.add('varieties');}
  if(!S.beanSelectedVarietyIds.includes(row.id))S.beanSelectedVarietyIds.push(row.id);
  inp.value='';
  renderVarietyDropdown();
  saveLocal(); // 品種追加はlocalのみ、豆登録時に同期
}

// ===== MASTER DATA =====
function renderBeanForm(){
  renderCountryDropdown();
  renderProcessDropdown();
  renderRLDropdown();
  renderVarietyDropdown();
}
// --- 国（単一選択・ID管理）---
function renderCountryDropdown(){
  const countryArray = S.beanSelectedCountryId != null ? [S.beanSelectedCountryId] : [];
  renderMultiSelectList('country-items', S.master.countries, countryArray, 'selectCountry', 'enabled', 'name', 'id');
  renderMultiSelectTags('country-box', 'country-placeholder', countryArray, S.master.countries, 'selectCountry', '国を選択...', 'name', 'id', countryName);
}
function selectCountry(id){
  // id=null は選択解除
  S.beanSelectedCountryId=S.beanSelectedCountryId===id?null:id;
  renderCountryDropdown();
  if(id!=null)closeAllDropdowns();
}
function addCountry(){
  const v=document.getElementById('b-country-free').value.trim();if(!v)return;
  let row=S.master.countries.find(r=>r.name===v&&r.enabled!==false);
  if(!row){row={id:Date.now(),name:v,enabled:true};S.master.countries.push(row);masterDirtyTypes.add('countries');}
  S.beanSelectedCountryId=row.id;
  document.getElementById('b-country-free').value='';
  renderCountryDropdown();closeAllDropdowns();
}
function getSelectedCountry(){return countryName(S.beanSelectedCountryId)||'';}
// --- 精製方法（複数選択・ID管理）---
function renderProcessDropdown(){
  renderMultiSelectList('process-items', S.master.processes, S.beanSelectedProcessIds, 'toggleBeanProcessMs', 'enabled', 'name', 'id');
  renderMultiSelectTags('process-box', 'process-placeholder', S.beanSelectedProcessIds, S.master.processes, 'toggleBeanProcessMs', '精製方法を選択...', 'name', 'id');
}
function toggleBeanProcessMs(id){
  if(S.beanSelectedProcessIds.includes(id))S.beanSelectedProcessIds=S.beanSelectedProcessIds.filter(x=>x!==id);
  else S.beanSelectedProcessIds.push(id);
  renderProcessDropdown();
}
function addProcess(){
  const v=document.getElementById('b-process-free').value.trim();if(!v)return;
  const sn=document.getElementById('b-process-shortn').value.trim();
  let row=S.master.processes.find(r=>r.name===v&&r.enabled!==false);
  if(!row){row={id:Date.now(),name:v,shortN:sn||undefined,enabled:true};S.master.processes.push(row);masterDirtyTypes.add('processes');}
  else if(sn&&!row.shortN){row.shortN=sn;masterDirtyTypes.add('processes');}
  if(!S.beanSelectedProcessIds.includes(row.id))S.beanSelectedProcessIds.push(row.id);
  document.getElementById('b-process-free').value='';
  document.getElementById('b-process-shortn').value='';
  renderProcessDropdown();
}
// --- 推奨焙煎度（複数選択・val管理）---
function renderRLDropdown(){
  renderMultiSelectList('rl-items', ROAST_LEVELS, S.beanSelectedRLVals, 'toggleBeanRLMs', 'enabled', 'val', 'val', rlLabel);
  renderMultiSelectTags('rl-box', 'rl-placeholder', S.beanSelectedRLVals, ROAST_LEVELS, 'toggleBeanRLMs', '焙煎度を選択...', 'val', 'val', rlLabel);
}
function toggleBeanRLMs(val){
  val=parseFloat(val);
  if(S.beanSelectedRLVals.includes(val))S.beanSelectedRLVals=S.beanSelectedRLVals.filter(x=>x!==val);
  else S.beanSelectedRLVals.push(val);
  renderRLDropdown();
}
// --- フィルタパネル ---
function toggleFilterPanel(){
  S.filterPanelOpen=!S.filterPanelOpen;
  const panel=document.getElementById('filter-panel');
  const arrow=document.getElementById('filter-arrow');
  if(panel)panel.style.display=S.filterPanelOpen?'block':'none';
  if(arrow)arrow.textContent=S.filterPanelOpen?'絞り込み ▲':'絞り込み ▼';
}
function updateFilterBadges(){
  const parts=[];
  if(S.filterCountryIds.length)parts.push('国×'+S.filterCountryIds.length);
  if(S.filterRLVals.length)parts.push('焙煎度×'+S.filterRLVals.length);
  if(S.filterYear)parts.push(S.filterYear+'年');
  if(S.filterMonth)parts.push(parseInt(S.filterMonth)+'月');
  const el=document.getElementById('filter-badges');
  if(el)el.textContent=parts.join(' ');
}
function initBrewSelect(){
  const sel=document.getElementById('t-brew-sel');
  sel.innerHTML=S.master.brews.map(b=>`<option value="${b}">${b}</option>`).join('')+`<option value="__free__">＋ その他（自由入力）</option>`;
}
function onBrewSel(){document.getElementById('t-brew-free-wrap').style.display=document.getElementById('t-brew-sel').value==='__free__'?'block':'none';}
function addBrew(){
  const v=document.getElementById('t-brew-free').value.trim();if(!v)return;
  if(!S.master.brews.includes(v))S.master.brews.push(v);
  initBrewSelect();document.getElementById('t-brew-sel').value=v;
  document.getElementById('t-brew-free-wrap').style.display='none';document.getElementById('t-brew-free').value='';saveLocal(); // 抽出方法追加はlocalのみ
}
function getSelectedBrew(){const v=document.getElementById('t-brew-sel').value;return v==='__free__'?document.getElementById('t-brew-free').value.trim():v;}
function initFilterButtons(){
  updateFilterBadges();
  // 国フィルタ（multi-select・ID管理）
  renderMultiSelectList('country-filter-items', S.master.countries, S.filterCountryIds, 'toggleCountryFilter', 'enabled', 'name', 'id');
  renderMultiSelectTags('country-filter-box', 'country-filter-placeholder', S.filterCountryIds, S.master.countries, 'toggleCountryFilter', 'すべての国', 'name', 'id', countryName);
  // 焙煎度フィルタ（multi-select・val管理）
  renderMultiSelectList('rl-filter-items', ROAST_LEVELS, S.filterRLVals, 'toggleRLFilter', 'enabled', 'val', 'val', rlLabel);
  renderMultiSelectTags('rl-filter-box', 'rl-filter-placeholder', S.filterRLVals, ROAST_LEVELS, 'toggleRLFilter', 'すべての焙煎度', 'val', 'val', rlLabel);
  // 購入年・月フィルタ
  const years=[...new Set(S.beans.map(b=>b.purchaseDate?.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
  const yEl=document.getElementById('year-filter');
  if(yEl){yEl.innerHTML='<option value="">すべての年</option>'+years.map(y=>`<option value="${y}"${S.filterYear===y?' selected':''}>${y}年</option>`).join('');}
  const months=[...Array(12)].map((_,i)=>String(i+1).padStart(2,'0'));
  const mEl=document.getElementById('month-filter');
  if(mEl){mEl.innerHTML='<option value="">すべての月</option>'+months.map(m=>`<option value="${m}"${S.filterMonth===m?' selected':''}>${parseInt(m)}月</option>`).join('');}
}
function setYearFilter(v){S.filterYear=v||null;renderBeans();}
function setMonthFilter(v){S.filterMonth=v||null;renderBeans();}
function toggleCountryFilter(id){
  if(S.filterCountryIds.includes(id))S.filterCountryIds=S.filterCountryIds.filter(x=>x!==id);
  else S.filterCountryIds.push(id);
  initFilterButtons();renderBeans();
}
function toggleRLFilter(val){
  val=parseFloat(val);
  if(S.filterRLVals.includes(val))S.filterRLVals=S.filterRLVals.filter(x=>x!==val);
  else S.filterRLVals.push(val);
  initFilterButtons();renderBeans();
}
function setCountryFilter(id){toggleCountryFilter(id);}
function setRLFilter(val){toggleRLFilter(val);}
function changeQty(d){const i=document.getElementById('b-amount');i.value=Math.max(0,(parseInt(i.value)||0)+d);}

