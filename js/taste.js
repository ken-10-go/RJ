// ================================================================
// taste.js — テイスト記録・フレーバーホイール・スライダー
// ================================================================
// Stars        : setStar
// Sliders      : renderRadarSliders, setRadarVal
// Flavor wheel : initFlavorWheel, selectFlavorCat, toggleFlavor
// Taste list   : renderTasteList, openTasteForm, closeTasteForm, deleteTaste
// Taste form   : resetTasteForm, updateTasteSelect, onTasteRecordChange,
//                updateElapsedDays, saveTaste
// ================================================================

let editingTasteId=null; // null=新規, number=編集中のtaste id

// ===== STARS =====
function setStar(n){
  S.stars=n;
  document.querySelectorAll('#taste-stars span').forEach((s,i)=>s.style.opacity=i<n?'1':'.3');
}

// ===== SLIDERS =====
function renderRadarChart(){}
function getRadarPointXY(i){return{x:0,y:0};}
function getRadarValueFromXY(i,cx,cy){return 3;}

function renderRadarSliders(){
  const wrap=document.getElementById('radar-sliders');if(!wrap)return;
  wrap.innerHTML=RADAR_LABELS.map((label,i)=>`
    <div class="rs-cell">
      <div class="rs-label">${label}</div>
      <div class="rs-row">
        <input class="rs-input" type="range" min="1" max="5" step="1" value="${S.radarVals[i]}"
          style="--val:${S.radarVals[i]}" oninput="setRadarVal(${i},this.value)">
        <span class="rs-val" id="rv${i}">${S.radarVals[i]}</span>
      </div>
    </div>`).join('');
}
function setRadarVal(idx,val){
  S.radarVals[idx]=parseInt(val);
  const el=document.getElementById('rv'+idx);if(el)el.textContent=val;
  const sliders=document.querySelectorAll('.rs-input');
  if(sliders[idx])sliders[idx].style.setProperty('--val',val);
}

// ===== FLAVOR WHEEL =====
function initFlavorWheel(){
  const el=document.getElementById('flavor-cats');if(!el)return;
  el.innerHTML=Object.keys(FLAVOR_WHEEL).map(cat=>`<button class="flavor-cat-btn" onclick="selectFlavorCat('${cat}')">${cat}</button>`).join('');
}
function selectFlavorCat(cat){
  S.activeFlavorCat=cat;
  document.querySelectorAll('.flavor-cat-btn').forEach(b=>b.classList.toggle('active',b.textContent===cat));
  document.getElementById('flavor-sub-label').textContent=cat+' のフレーバー:';
  document.getElementById('flavor-subs').innerHTML=FLAVOR_WHEEL[cat].map(s=>`<button class="flavor-sub-btn${S.selectedFlavors.includes(s)?' selected':''}" onclick="toggleFlavor('${s}')">${s}</button>`).join('');
}
function toggleFlavor(f){
  if(S.selectedFlavors.includes(f))S.selectedFlavors=S.selectedFlavors.filter(x=>x!==f);
  else S.selectedFlavors.push(f);
  if(S.activeFlavorCat)selectFlavorCat(S.activeFlavorCat);
  document.getElementById('flavor-selected').innerHTML=S.selectedFlavors.map(f=>`<span class="flavor-tag">${f}<button onclick="toggleFlavor('${f}')">×</button></span>`).join('');
}

// ===== FORM RESET =====
function resetTasteForm(){
  S.stars=0;
  document.querySelectorAll('#taste-stars span').forEach(s=>s.style.opacity='.3');
  S.radarVals=[3,3,3,3,3,3];
  renderRadarSliders();
  S.selectedFlavors=[];
  S.activeFlavorCat=null;
  const fs=document.getElementById('flavor-selected');if(fs)fs.innerHTML='';
  const subs=document.getElementById('flavor-subs');if(subs)subs.innerHTML='';
  const lbl=document.getElementById('flavor-sub-label');if(lbl)lbl.textContent='カテゴリを選ぶとフレーバーが表示されます';
  document.querySelectorAll('.flavor-cat-btn').forEach(b=>b.classList.remove('active'));
  ['t-notes','t-memo','t-bean-g','t-water-ml','t-water-temp','t-brew-sec'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const gr=document.getElementById('t-grind');if(gr)gr.value='';
}

// ===== TASTE LIST =====
function renderTasteList(){
  const el=document.getElementById('taste-list');if(!el)return;
  const roastId=parseInt(document.getElementById('t-record').value);
  if(!roastId){el.innerHTML='';return;}
  const tastes=S.tasteRecords.filter(t=>t.roastId===roastId).sort((a,b)=>a.id-b.id);
  if(!tastes.length){
    el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-sm);padding:6px 0 10px;">まだ記録がありません</div>';
    return;
  }
  el.innerHTML=tastes.map(t=>{
    const dateStr=new Date(t.recordedAt||t.id).toLocaleDateString('ja-JP');
    const starsStr='★'.repeat(t.stars||0)+'☆'.repeat(5-(t.stars||0));
    const brew=t.brew||'—';
    return`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;color:#e8a040;letter-spacing:1px;">${starsStr}</div>
        <div style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-top:2px;">${dateStr} · ${brew} · 焙煎後${t.elapsedDays!=null?t.elapsedDays:'—'}日</div>
        ${t.flavors&&t.flavors.length?`<div style="font-size:var(--fs-xs);color:var(--c-text);margin-top:2px;">${t.flavors.join(' · ')}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px;">
        <button class="btn btn-outline btn-sm" onclick="openTasteForm(${t.id})">編集</button>
        <button class="btn btn-sm" style="background:none;border:1px solid var(--c-danger);color:var(--c-danger);border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;" onclick="deleteTaste(${t.id})">削除</button>
      </div>
    </div>`;
  }).join('');
}

function openTasteForm(tasteId){
  editingTasteId=tasteId||null;
  const titleEl=document.getElementById('taste-form-title');
  if(titleEl)titleEl.textContent=editingTasteId?'味わいを編集':'新しい味わいを追加';
  const delBtn=document.getElementById('taste-delete-btn');
  if(delBtn)delBtn.style.display=editingTasteId?'block':'none';
  if(editingTasteId){
    const t=S.tasteRecords.find(t=>t.id===editingTasteId);
    if(t){
      setStar(t.stars||0);
      S.radarVals=[t.acidity,t.sweetness,t.body,t.bitterness,t.aroma,t.aftertaste].map(v=>parseInt(v)||3);
      renderRadarSliders();
      S.selectedFlavors=[...(t.flavors||[])];
      const fs=document.getElementById('flavor-selected');
      if(fs)fs.innerHTML=S.selectedFlavors.map(f=>`<span class="flavor-tag">${f}<button onclick="toggleFlavor('${f}')">×</button></span>`).join('');
      document.getElementById('t-notes').value=t.notes||'';
      document.getElementById('t-memo').value=t.memo||'';
      if(t.brew){initBrewSelect();setTimeout(()=>{const bs=document.getElementById('t-brew-sel');if(bs)bs.value=t.brew;},50);}
      document.getElementById('t-bean-g').value=t.beanG||'';
      document.getElementById('t-water-ml').value=t.waterMl||'';
      document.getElementById('t-water-temp').value=t.waterTemp||'';
      document.getElementById('t-brew-sec').value=t.brewSec||'';
      document.getElementById('t-grind').value=t.grind||'';
    }
  }else{
    resetTasteForm();
  }
  const formArea=document.getElementById('taste-form-area');
  if(formArea){
    formArea.style.display='block';
    setTimeout(()=>formArea.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }
}

function closeTasteForm(){
  editingTasteId=null;
  const formArea=document.getElementById('taste-form-area');
  if(formArea)formArea.style.display='none';
}

function deleteTaste(id){
  if(!confirm('この味わい記録を削除しますか？'))return;
  pushUndo();
  S.tasteRecords=S.tasteRecords.filter(t=>t.id!==id);
  if(editingTasteId===id)closeTasteForm();
  renderTasteList();
  toast('削除しました');autoSync();
}

// ===== SELECT / ELAPSED =====
function updateTasteSelect(){
  initBrewSelect();
  const s=document.getElementById('t-record');if(!s)return;
  s.innerHTML=S.roastRecords.length?S.roastRecords.slice().reverse().map(r=>{
    const b=S.beans.find(b=>b.id===r.beanId);
    const tProcs=b&&b.processIds&&b.processIds.length?processShortNFromIds(b.processIds):(b&&b.processes||[]);
    const cname=b?(countryName(b.countryId)||(b.country||'')):'';
    const bInfo=b?`${cname?cname+' / ':''}${b.name}${roastSeqNum(r)}${tProcs.length?' / '+tProcs.join('·'):''}`:' 不明';
    return`<option value="${r.id}">${bInfo} (${new Date(r.startTime).toLocaleDateString('ja-JP')})</option>`;
  }).join(''):'<option>焙煎記録がありません</option>';
  onTasteRecordChange();
}
function onTasteRecordChange(){
  updateElapsedDays();
  closeTasteForm();
  renderTasteList();
}
function updateElapsedDays(){
  const sel=document.getElementById('t-record');if(!sel)return;
  const r=S.roastRecords.find(r=>r.id===parseInt(sel.value));
  const el=document.getElementById('elapsed-days-display');if(!el)return;
  if(r){const d=Math.floor((Date.now()-new Date(r.startTime).getTime())/86400000);el.textContent='焙煎から '+d+' 日経過';}
  else el.textContent='';
}

// ===== SAVE =====
function saveTaste(){
  if(!S.roastRecords.length){toast('焙煎記録がありません');return;}
  const roastId=parseInt(document.getElementById('t-record').value);
  const r=S.roastRecords.find(r=>r.id===roastId);
  const days=r?Math.floor((Date.now()-new Date(r.startTime).getTime())/86400000):null;
  const existing=editingTasteId?S.tasteRecords.find(t=>t.id===editingTasteId):null;
  const record={
    id:editingTasteId||Date.now(),
    roastId,
    stars:S.stars,
    elapsedDays:days,
    acidity:S.radarVals[0],sweetness:S.radarVals[1],body:S.radarVals[2],
    bitterness:S.radarVals[3],aroma:S.radarVals[4],aftertaste:S.radarVals[5],
    flavors:[...S.selectedFlavors],
    notes:document.getElementById('t-notes').value,
    brew:getSelectedBrew(),
    beanG:parseFloat(document.getElementById('t-bean-g').value)||null,
    waterMl:parseFloat(document.getElementById('t-water-ml').value)||null,
    waterTemp:parseFloat(document.getElementById('t-water-temp').value)||null,
    brewSec:parseFloat(document.getElementById('t-brew-sec').value)||null,
    grind:document.getElementById('t-grind').value||null,
    memo:document.getElementById('t-memo').value,
    recordedAt:existing?existing.recordedAt:new Date().toISOString()
  };
  pushUndo();
  const idx=S.tasteRecords.findIndex(t=>t.id===record.id);
  if(idx>=0)S.tasteRecords[idx]=record;else S.tasteRecords.push(record);
  closeTasteForm();
  renderTasteList();
  toast('味わいを記録しました');autoSync();
}
