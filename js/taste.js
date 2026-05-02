// ================================================================
// taste.js — テイスト記録・フレーバーホイール・スライダー
// ================================================================
// Stars        : setStar
// Sliders      : renderRadarSliders, setRadarVal
// Flavor wheel : initFlavorWheel, selectFlavorCat, toggleFlavor
// Taste form   : updateTasteSelect, updateElapsedDays, saveTaste
// ================================================================

// ===== TASTE =====
function setStar(n){
  S.stars=n;
  document.querySelectorAll('#taste-stars span').forEach((s,i)=>s.style.opacity=i<n?'1':'.3');
}

// ===== SLIDERS =====
// チャート廃止 — スタブのみ残す（saveTaste等が参照しないが念のため）
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
  // スライダーの塗りつぶし色を更新
  const sliders=document.querySelectorAll('.rs-input');
  if(sliders[idx])sliders[idx].style.setProperty('--val',val);
}

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
function updateTasteSelect(){
  initBrewSelect();
  const s=document.getElementById('t-record');if(!s)return;
  s.innerHTML=S.roastRecords.length?S.roastRecords.slice().reverse().map(r=>{
    const b=S.beans.find(b=>b.id===r.beanId);
    const tProcs=b&&b.processIds&&b.processIds.length?processShortNFromIds(b.processIds):(b&&b.processes||[]);
    const bInfo=b?`${b.country?b.country+' / ':''}${b.name}${roastSeqNum(r)}${tProcs.length?' / '+tProcs.join('·'):''}`:' 不明';
    return`<option value="${r.id}">${bInfo} (${new Date(r.startTime).toLocaleDateString('ja-JP')})</option>`;
  }).join(''):'<option>焙煎記録がありません</option>';
  updateElapsedDays();
}
function updateElapsedDays(){
  const sel=document.getElementById('t-record');if(!sel)return;
  const r=S.roastRecords.find(r=>r.id===parseInt(sel.value));
  const el=document.getElementById('elapsed-days-display');if(!el)return;
  if(r){const d=Math.floor((Date.now()-new Date(r.startTime).getTime())/86400000);el.textContent='焙煎から '+d+' 日経過';}
  else el.textContent='';
}
function saveTaste(){
  if(!S.roastRecords.length){toast('焙煎記録がありません');return;}
  const roastId=parseInt(document.getElementById('t-record').value);
  const r=S.roastRecords.find(r=>r.id===roastId);
  const days=r?Math.floor((Date.now()-new Date(r.startTime).getTime())/86400000):null;
  const idx=S.tasteRecords.findIndex(t=>t.roastId===roastId);
  const beanG=parseFloat(document.getElementById('t-bean-g').value)||null;
  const waterMl=parseFloat(document.getElementById('t-water-ml').value)||null;
  const waterTemp=parseFloat(document.getElementById('t-water-temp').value)||null;
  const brewSec=parseFloat(document.getElementById('t-brew-sec').value)||null;
  const grind=document.getElementById('t-grind').value||null;
  const record={id:idx>=0?S.tasteRecords[idx].id:Date.now(),roastId,stars:S.stars,elapsedDays:days,acidity:S.radarVals[0],sweetness:S.radarVals[1],body:S.radarVals[2],bitterness:S.radarVals[3],aroma:S.radarVals[4],aftertaste:S.radarVals[5],flavors:[...S.selectedFlavors],notes:document.getElementById('t-notes').value,brew:getSelectedBrew(),beanG,waterMl,waterTemp,brewSec,grind,memo:document.getElementById('t-memo').value,recordedAt:new Date().toISOString()};
  pushUndo();
  if(idx>=0)S.tasteRecords[idx]=record;else S.tasteRecords.push(record);
  toast('味わいを記録しました');autoSync();
}
