// ================================================================
// taste.js — テイスト記録・フレーバーホイール・レーダーチャート
// ================================================================
// Stars        : setStar
// Radar chart  : getRadarPointXY, getRadarValueFromXY,
//                renderRadarChart, attachRadarDrag,
//                renderRadarSliders, setRadarVal
// Flavor wheel : initFlavorWheel, selectFlavorCat, toggleFlavor
// Taste form   : updateTasteSelect, updateElapsedDays, saveTaste
// ================================================================

// ===== TASTE =====
function setStar(n){
  S.stars=n;
  document.querySelectorAll('#taste-stars span').forEach((s,i)=>s.style.opacity=i<n?'1':'.3');
}

// ===== RADAR =====
let radarDragIdx=-1;
let radarDragActive=false;

function getRadarPointXY(i){return{x:0,y:0};}
function getRadarValueFromXY(i,cx,cy){return 3;}

function renderRadarChart(){
  if(radarChart){radarChart.destroy();radarChart=null;}
  const canvas=document.getElementById('radar-chart');if(!canvas)return;
  canvas.dataset.dragAttached='';
  const ctx=canvas.getContext('2d');
  radarChart=new Chart(ctx,{
    type:'radar',
    data:{labels:RADAR_LABELS,datasets:[{
      label:'味わい',data:[...S.radarVals],
      backgroundColor:'rgba(196,122,58,0.22)',borderColor:'#c47a3a',borderWidth:2,
      pointBackgroundColor:'#e8841e',pointBorderColor:'#f5e6c8',
      pointRadius:12,pointHoverRadius:14,pointBorderWidth:2,
    }]},
    options:{
      responsive:false,animation:{duration:150},
      scales:{r:{
        min:0,max:5,
        ticks:{stepSize:1,color:'#92400e',font:{size:11},backdropColor:'transparent'},
        grid:{color:'rgba(146,64,14,0.25)'},
        pointLabels:{color:'#92400e',font:{size:13},
          callback:(label,i)=>label+' ('+S.radarVals[i]+')'},
      }},
      plugins:{legend:{display:false},tooltip:{display:false}}
    }
  });
  attachRadarDrag(canvas);
}

function attachRadarDrag(canvas){
  const CW=canvas.width,CH=canvas.height,CX=CW/2,CY=CH/2;
  const MAX_R=Math.min(CW,CH)*0.38;
  const N=RADAR_LABELS.length;
  function angleOf(i){return(2*Math.PI/N)*i-Math.PI/2;}
  function pointXY(i){const r=MAX_R*(S.radarVals[i]/5);return{x:CX+Math.cos(angleOf(i))*r,y:CY+Math.sin(angleOf(i))*r};}
  function valueFromXY(i,x,y){const a=angleOf(i);const proj=(x-CX)*Math.cos(a)+(y-CY)*Math.sin(a);return Math.min(5,Math.max(1,Math.round(proj/MAX_R*5)));}
  function getXY(e){const rect=canvas.getBoundingClientRect();const src=e.touches?e.touches[0]:e;return{x:(src.clientX-rect.left)*(CW/rect.width),y:(src.clientY-rect.top)*(CH/rect.height)};}
  function onStart(e){e.preventDefault();e.stopPropagation();const{x,y}=getXY(e);radarDragIdx=-1;for(let i=0;i<N;i++){const p=pointXY(i);if(Math.hypot(p.x-x,p.y-y)<40){radarDragIdx=i;break;}}if(radarDragIdx>=0)radarDragActive=true;}
  function onMove(e){if(!radarDragActive||radarDragIdx<0)return;e.preventDefault();e.stopPropagation();const{x,y}=getXY(e);const v=valueFromXY(radarDragIdx,x,y);if(v!==S.radarVals[radarDragIdx]){S.radarVals[radarDragIdx]=v;if(radarChart){radarChart.data.datasets[0].data=[...S.radarVals];radarChart.update('none');}}}
  function onEnd(){radarDragActive=false;radarDragIdx=-1;}
  if(canvas.dataset.dragAttached==='1')return;
  canvas.dataset.dragAttached='1';
  canvas.addEventListener('mousedown',onStart);
  window.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onEnd);
  canvas.addEventListener('touchstart',onStart,{passive:false});
  window.addEventListener('touchmove',onMove,{passive:false});
  window.addEventListener('touchend',onEnd);
}

function renderRadarSliders(){}
function setRadarVal(idx,val){
  S.radarVals[idx]=parseInt(val);
  if(radarChart){radarChart.data.datasets[0].data=[...S.radarVals];radarChart.update();}
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
