// ================================================================
// records.js — 焙煎記録一覧・記録編集モーダル・分析
// ================================================================
// Records list : renderRecords, openRecordModal, closeRecordModal,
//                deleteRoastRecord, editTasteFromRecord
// Edit modal   : openEditRoastModal, closeEditRoastModal,
//                calcEditWeightLoss, saveEditRoast
// Edit events  : renderErEvents, erUpdateEventTime, erUpdateEventLabel,
//                erUpdateEventTemp, erDeleteEvent, erAddEvent
// Edit temps   : renderErTemps, erUpdateTemp, erDeleteTemp
// Analysis     : renderAnalysis, renderAnalysisChart,
//                renderCompareSection, updateCompareChart, runAI
// Misc         : erFmt
// ================================================================

// ===== RECORDS =====
let recordGroupMode='date';
function setRecordGroup(mode){
  recordGroupMode=mode;
  ['date','bean'].forEach(m=>{
    const btn=document.getElementById('rec-grp-'+m);if(!btn)return;
    const active=m===mode;
    btn.style.background=active?'var(--c-accent)':'';
    btn.style.color=active?'#1a0f07':'';
    btn.style.borderColor=active?'var(--c-accent)':'';
  });
  renderRecords();
}
function _recRow(r,showBean){
  const b=S.beans.find(b=>b.id===r.beanId);
  const tastes=S.tasteRecords.filter(t=>t.roastId===r.id);
  const bestStars=tastes.length?Math.max(...tastes.map(t=>t.stars||0)):0;
  const rProcs=b&&b.processIds&&b.processIds.length?processShortNFromIds(b.processIds):(b&&b.processes||[]);
  const rProcStr=rProcs.length?' / '+rProcs.join('·'):'';
  const rcname=b?(countryName(b.countryId)||(b.country||'')):'';
  const beanLabel=b?(rcname?rcname+' / ':'')+b.name+roastSeqNum(r)+rProcStr:'不明の豆';
  const dateLabel=new Date(r.startTime).toLocaleDateString('ja-JP');
  const hd=showBean
    ?`<div class="rec-bean">${beanLabel}</div><div class="rec-date">${dateLabel}</div>`
    :`<div class="rec-date" style="font-size:var(--fs-sm);color:var(--c-text);font-weight:600;">${dateLabel}</div>`;
  return`<div class="rec" onclick="openRecordModal(${r.id})"><div class="rec-hd">${hd}</div><div class="rec-stats"><span class="rec-s">時間: <span>${Math.floor(r.duration/60)}分${r.duration%60}秒</span></span>${r.roastLevel?`<span class="rec-s">焙煎度: <span>${rlLabel(r.roastLevel)}</span></span>`:''}${bestStars?`<span class="rec-s">評価: <span>${'★'.repeat(bestStars)}</span></span>`:''}</div></div>`;
}
function renderRecords(){
  const el=document.getElementById('records-list');if(!el)return;
  if(!S.roastRecords.length){el.innerHTML='<div class="empty">焙煎記録がありません</div>';return;}
  const sorted=S.roastRecords.slice().sort((a,b)=>b.id-a.id);
  let html='';
  if(recordGroupMode==='date'){
    const groups={};
    sorted.forEach(r=>{
      const dk=new Date(r.startTime).toLocaleDateString('ja-JP');
      if(!groups[dk])groups[dk]=[];
      groups[dk].push(r);
    });
    Object.entries(groups).forEach(([dk,recs])=>{
      html+=`<div class="rec-group-hd">📅 ${dk}</div>`;
      recs.forEach(r=>{html+=_recRow(r,true);});
    });
  }else{
    // 豆別: 各豆の最新焙煎日時でソート
    const beanIds=[...new Set(sorted.map(r=>r.beanId))];
    beanIds.forEach(bid=>{
      const recs=sorted.filter(r=>r.beanId===bid);
      const b=S.beans.find(b=>b.id===bid);
      const rcname=b?(countryName(b.countryId)||(b.country||'')):'';
      const bLabel=b?(rcname?rcname+' / ':'')+b.name:'不明の豆';
      html+=`<div class="rec-group-hd">☕ ${bLabel}（${recs.length}件）</div>`;
      recs.forEach(r=>{html+=_recRow(r,false);});
    });
  }
  el.innerHTML=html;
}
function openRecordModal(id){
  const r=S.roastRecords.find(r=>r.id===id);if(!r)return;
  const b=S.beans.find(b=>b.id===r.beanId);
  const mProcs=b&&b.processIds&&b.processIds.length?processShortNFromIds(b.processIds):(b&&b.processes||[]);
  const mProcStr=mProcs.length?' / '+mProcs.join('·'):'';
  const mcname=b?(countryName(b.countryId)||(b.country||'')):'';
  document.getElementById('modal-bean-name').textContent=b?(mcname?mcname+' / ':'')+b.name+roastSeqNum(r)+mProcStr:'不明の豆';
  let html=`<div class="sync-info" style="margin-bottom:12px;"><div class="sync-row"><span class="sync-label">焙煎日</span><span class="sync-val">${new Date(r.startTime).toLocaleString('ja-JP')}</span></div><div class="sync-row"><span class="sync-label">焙煎時間</span><span class="sync-val">${Math.floor(r.duration/60)}分${r.duration%60}秒</span></div>${r.startTemp?`<div class="sync-row"><span class="sync-label">スタート温度</span><span class="sync-val">${r.startTemp}°C</span></div>`:''}${r.finalTemp?`<div class="sync-row"><span class="sync-label">仕上がり温度</span><span class="sync-val">${r.finalTemp}°C</span></div>`:''}${r.roastLevel?`<div class="sync-row"><span class="sync-label">焙煎度</span><span class="sync-val">${rlLabel(r.roastLevel)}</span></div>`:''}${r.amount?`<div class="sync-row"><span class="sync-label">投入量</span><span class="sync-val">${r.amount}g</span></div>`:''}${r.weightBefore&&r.weightAfter?`<div class="sync-row"><span class="sync-label">重量</span><span class="sync-val">${r.weightBefore}g → ${r.weightAfter}g（歩留 ${r.yieldPct}%）</span></div>`:''}${r.dtr!==null&&r.dtr!==undefined?`<div class="sync-row"><span class="sync-label">DTR（発展時間率）</span><span class="sync-val">${r.dtr}%</span></div>`:''}<div class="sync-row"><span class="sync-label">水洗</span><span class="sync-val">${r.washing?'済み':'なし'}</span></div>${r.memo?`<div class="sync-row"><span class="sync-label">メモ</span><span class="sync-val">${r.memo}</span></div>`:''}</div>`;
  if(r.events&&r.events.length){html+=`<div class="label" style="margin-bottom:6px;">イベント</div><div class="event-log" style="max-height:120px;margin-bottom:12px;">`;r.events.forEach(ev=>{html+=`<div class="ev"><span class="ev-t">${ft(ev.time)}</span><span class="ev-x">${ev.label}${ev.temp?' @ '+ev.temp+'°C':''}</span></div>`;});html+=`</div>`;}
  if(r.tempData&&r.tempData.length)html+=`<div class="label" style="margin-bottom:6px;">温度カーブ</div><div class="chart-wrap"><canvas id="modal-chart" height="160"></canvas></div>`;
  // 味わい記録リスト（1:M対応）
  const tastes=S.tasteRecords.filter(t=>t.roastId===r.id).sort((a,b)=>a.id-b.id);
  html+=`<div class="label" style="margin:12px 0 6px;">味わい記録（${tastes.length}件）</div>`;
  if(tastes.length){
    html+=`<div class="sync-info" style="margin-bottom:10px;">`;
    tastes.forEach(t=>{
      const dateStr=new Date(t.recordedAt||t.id).toLocaleDateString('ja-JP');
      html+=`<div style="padding:8px 0;border-bottom:1px solid var(--border);"><div style="display:flex;justify-content:space-between;align-items:center;"><div><span style="color:#e8a040;">${'★'.repeat(t.stars||0)}</span><span style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-left:6px;">${dateStr} · ${t.brew||'—'} · 焙煎後${t.elapsedDays!=null?t.elapsedDays:'—'}日</span></div><button class="btn btn-outline btn-sm" onclick="editTasteFromRecord(${r.id},${t.id})">編集</button></div>${t.flavors&&t.flavors.length?`<div style="font-size:var(--fs-xs);color:var(--c-text);margin-top:3px;">${t.flavors.join(' · ')}</div>`:''}${t.notes?`<div style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-top:2px;">${t.notes}</div>`:''}</div>`;
    });
    html+=`</div>`;
  }else{
    html+=`<div style="color:var(--c-text-muted);font-size:var(--fs-sm);margin-bottom:10px;">まだ記録がありません</div>`;
  }
  html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;"><button class="btn btn-outline" onclick="openEditRoastModal(${r.id})">焙煎記録を編集</button><button class="btn btn-outline" onclick="editTasteFromRecord(${r.id},null)">＋ 味わいを追加</button></div><button class="btn btn-danger" style="width:100%;margin-top:8px;" onclick="deleteRoastRecord(${r.id})">この焙煎記録を削除</button>`;
  document.getElementById('modal-content').innerHTML=html;
  document.getElementById('record-modal').classList.add('open');
  if(r.tempData&&r.tempData.length){setTimeout(()=>{const ctx2=document.getElementById('modal-chart').getContext('2d');new Chart(ctx2,{type:'line',data:{labels:r.timeData.map(t=>ft(t)),datasets:[{label:'温度',data:r.tempData,borderColor:'#c47a3a',backgroundColor:'rgba(196,122,58,0.1)',borderWidth:2,pointRadius:2,tension:0.4,fill:true,yAxisID:'y'},{label:'ROR',data:r.tempData.map((t,i)=>i===0?null:parseFloat((t-r.tempData[i-1]).toFixed(1))),borderColor:'#5a8a3a',borderWidth:1.5,pointRadius:1,tension:0.4,fill:false,yAxisID:'y1'}]},options:{responsive:true,plugins:{legend:{labels:{color:'#a07850',font:{size:10}}}},scales:{x:{ticks:{color:'#a07850',font:{size:8},maxTicksLimit:8},grid:{color:'rgba(196,122,58,0.08)'}},y:{ticks:{color:'#a07850',font:{size:8}},grid:{color:'rgba(196,122,58,0.08)'},position:'left'},y1:{ticks:{color:'#5a8a3a',font:{size:8}},grid:{display:false},position:'right'}}}});},100);}
}
function deleteRoastRecord(id){
  if(!confirm('この焙煎記録を削除しますか？\n関連する味わい記録も削除されます。'))return;
  pushUndo();
  S.roastRecords=S.roastRecords.filter(r=>r.id!==id);
  S.tasteRecords=S.tasteRecords.filter(t=>t.roastId!==id);
  closeRecordModal();renderRecords();updateTasteSelect();
  toast('削除しました');autoSync();
}
let erTempBuf=[],erEventBuf=[];
function erFmt(s){return Math.floor(s/60).toString().padStart(2,'0')+':'+(s%60).toString().padStart(2,'0');}
function openEditRoastModal(id){
  const r=S.roastRecords.find(r=>r.id===id);if(!r)return;
  const sel=document.getElementById('er-rl');
  sel.innerHTML=ROAST_LEVELS.map(rl=>`<option value="${rl.val}"${rl.val===r.roastLevel?' selected':''}>${rl.val.toFixed(1)} ${rl.ja} — ${rl.sub}</option>`).join('');
  document.getElementById('er-weight-before').value=r.weightBefore||'';
  document.getElementById('er-weight-after').value=r.weightAfter||'';
  document.getElementById('er-memo').value=r.memo||'';
  document.getElementById('er-id').value=id;
  erEventBuf=JSON.parse(JSON.stringify(r.events||[]));
  erTempBuf=r.tempData.map((t,i)=>({temp:t,time:r.timeData[i]}));
  calcEditWeightLoss();renderErEvents();renderErTemps();
  closeRecordModal();
  document.getElementById('edit-roast-modal').classList.add('open');
}
function closeEditRoastModal(){document.getElementById('edit-roast-modal').classList.remove('open');}
function calcEditWeightLoss(){
  const b=parseFloat(document.getElementById('er-weight-before').value);
  const a=parseFloat(document.getElementById('er-weight-after').value);
  const el=document.getElementById('er-weight-loss');
  if(!isNaN(b)&&!isNaN(a)&&b>0){const pct=parseFloat((a/b*100).toFixed(1));el.textContent=`歩留まり: ${pct}%（${b}g → ${a}g）`;}
  else el.textContent='';
}
function renderErEvents(){
  const el=document.getElementById('er-events');
  if(!erEventBuf.length){el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-xs);padding:4px;">イベントなし</div>';return;}
  el.innerHTML=erEventBuf.map((ev,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(196,122,58,.1);"><input type="text" value="${erFmt(ev.time)}" style="width:46px;background:#f3f4f6 (rgb(243, 244, 246), opacity:.8);border:1px solid var(--border);border-radius:4px;padding:3px 5px;color:var(--c-text);font-family:'DM Mono',monospace;font-size:10px;" onchange="erUpdateEventTime(${i},this.value)"><input type="text" value="${ev.label}" style="flex:1;background:#f3f4f6 (rgb(243, 244, 246), opacity:.8);border:1px solid var(--border);border-radius:4px;padding:3px 5px;color:var(--c-text);font-size:11px;" onchange="erUpdateEventLabel(${i},this.value)"><input type="number" value="${ev.temp||''}" placeholder="°C" style="width:52px;background:#f3f4f6 (rgb(243, 244, 246), opacity:.8);border:1px solid var(--border);border-radius:4px;padding:3px 5px;color:var(--c-text);font-family:'DM Mono',monospace;font-size:10px;" onchange="erUpdateEventTemp(${i},this.value)"><button onclick="erDeleteEvent(${i})" style="background:none;border:none;color:var(--c-danger);cursor:pointer;font-size:14px;padding:0 2px;">✕</button></div>`).join('');
}
function erUpdateEventTime(i,val){const p=val.split(':');if(p.length!==2)return;erEventBuf[i].time=parseInt(p[0])*60+parseInt(p[1]);}
function erUpdateEventLabel(i,val){erEventBuf[i].label=val;}
function erUpdateEventTemp(i,val){erEventBuf[i].temp=val?parseFloat(val):null;}
function erDeleteEvent(i){pushUndo();erEventBuf.splice(i,1);renderErEvents();}
function erAddEvent(){erEventBuf.push({time:0,label:'',temp:null,rlVal:null});renderErEvents();setTimeout(()=>{const el=document.getElementById('er-events');el.scrollTop=el.scrollHeight;},50);}
function renderErTemps(){
  const el=document.getElementById('er-temps');
  if(!erTempBuf.length){el.innerHTML='<div style="color:var(--c-text-muted);padding:4px;">温度データなし</div>';return;}
  el.innerHTML=erTempBuf.map((td,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(196,122,58,.06);"><span style="color:var(--c-accent);min-width:38px;">${erFmt(td.time)}</span><input type="number" value="${td.temp}" style="width:60px;background:#f3f4f6 (rgb(243, 244, 246), opacity:.8);border:1px solid var(--border);border-radius:4px;padding:2px 5px;color:var(--c-text);font-family:'DM Mono',monospace;font-size:10px;" onchange="erUpdateTemp(${i},this.value)"><span style="color:var(--c-text-muted);font-size:10px;">°C</span><button onclick="erDeleteTemp(${i})" style="background:none;border:none;color:var(--c-danger);cursor:pointer;font-size:13px;padding:0 2px;margin-left:auto;">✕</button></div>`).join('');
}
function erUpdateTemp(i,val){erTempBuf[i].temp=parseFloat(val);}
function erDeleteTemp(i){pushUndo();erTempBuf.splice(i,1);renderErTemps();}
function saveEditRoast(){
  const id=parseInt(document.getElementById('er-id').value);
  const idx=S.roastRecords.findIndex(r=>r.id===id);if(idx<0)return;
  pushUndo();
  const rl=parseFloat(document.getElementById('er-rl').value);
  const wb=parseFloat(document.getElementById('er-weight-before').value)||null;
  const wa=parseFloat(document.getElementById('er-weight-after').value)||null;
  const yieldPct=wb&&wa?parseFloat((wa/wb*100).toFixed(1)):null;
  S.roastRecords[idx]={...S.roastRecords[idx],roastLevel:rl,weightBefore:wb,weightAfter:wa,yieldPct,memo:document.getElementById('er-memo').value,events:JSON.parse(JSON.stringify(erEventBuf)),tempData:erTempBuf.map(t=>t.temp),timeData:erTempBuf.map(t=>t.time)};
  closeEditRoastModal();renderRecords();
  toast('焙煎記録を更新しました');autoSync();
}
function editTasteFromRecord(roastId,tasteId){
  closeRecordModal();switchTab('taste');
  setTimeout(()=>{
    const sel=document.getElementById('t-record');
    if(sel)sel.value=roastId;
    updateElapsedDays();
    renderTasteList();
    openTasteForm(tasteId||null);
  },200);
}
function closeRecordModal(){document.getElementById('record-modal').classList.remove('open');}

// ===== ANALYSIS =====
function renderAnalysis(){
  document.getElementById('analysis-stats').innerHTML=`<div class="a-stat"><span class="a-lbl">総焙煎回数</span><span class="a-val">${S.roastRecords.length} 回</span></div><div class="a-stat"><span class="a-lbl">登録豆数</span><span class="a-val">${S.beans.length} 種</span></div><div class="a-stat"><span class="a-lbl">味わい記録数</span><span class="a-val">${S.tasteRecords.length} 件</span></div><div class="a-stat"><span class="a-lbl">平均焙煎時間</span><span class="a-val">${S.roastRecords.length?Math.round(S.roastRecords.reduce((a,r)=>a+r.duration,0)/S.roastRecords.length)+'秒':'—'}</span></div>`;
  renderAnalysisChart();renderCompareSection();
}
function renderAnalysisChart(){
  const ctx=document.getElementById('analysis-chart').getContext('2d');
  if(analysisChart)analysisChart.destroy();
  const labels=S.beans.map(b=>b.name);const counts=S.beans.map(b=>S.roastRecords.filter(r=>r.beanId===b.id).length);
  analysisChart=new Chart(ctx,{type:'bar',data:{labels:labels.length?labels:['データなし'],datasets:[{label:'焙煎回数',data:counts.length?counts:[0],backgroundColor:'rgba(196,122,58,0.5)',borderColor:'#c47a3a',borderWidth:1}]},options:{responsive:true,plugins:{legend:{labels:{color:'#a07850',font:{size:10}}}},scales:{x:{ticks:{color:'#a07850',font:{size:9}},grid:{color:'rgba(196,122,58,0.08)'}},y:{ticks:{color:'#a07850',font:{size:9}},grid:{color:'rgba(196,122,58,0.08)'}}}}});
}
function renderCompareSection(){
  const el=document.getElementById('compare-checks');
  if(!S.roastRecords.length){el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-sm);">焙煎記録がありません</div>';return;}
  el.innerHTML=S.roastRecords.slice().reverse().map(r=>{const b=S.beans.find(b=>b.id===r.beanId);return`<div class="compare-check"><input type="checkbox" id="cmp-${r.id}" value="${r.id}" onchange="updateCompareChart()"><label for="cmp-${r.id}" style="font-size:var(--fs-sm);color:var(--c-text);cursor:pointer;">${b?b.name:'不明'} (${new Date(r.startTime).toLocaleDateString('ja-JP')})</label></div>`;}).join('');
}
function updateCompareChart(){
  const checked=[...document.querySelectorAll('#compare-checks input:checked')].map(el=>parseInt(el.value));
  const ctx=document.getElementById('compare-chart').getContext('2d');
  if(compareChart)compareChart.destroy();
  const colors=['#c47a3a','#5a8a3a','#7ab3f5','#e06040','#e8a040','var(--c-green)'];
  const datasets=checked.map((id,i)=>{const r=S.roastRecords.find(r=>r.id===id);const b=S.beans.find(b=>b.id===r.beanId);return{label:(b?b.name:'不明')+' ('+new Date(r.startTime).toLocaleDateString('ja-JP')+')',data:r.tempData,borderColor:colors[i%colors.length],backgroundColor:'transparent',borderWidth:2,pointRadius:1,tension:0.4,fill:false};});
  const labels=checked.length?S.roastRecords.find(r=>r.id===checked[0]).timeData.map(t=>ft(t)):[];
  compareChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,plugins:{legend:{labels:{color:'#a07850',font:{size:9}}}},scales:{x:{ticks:{color:'#a07850',font:{size:8},maxTicksLimit:8},grid:{color:'rgba(196,122,58,0.08)'}},y:{ticks:{color:'#a07850',font:{size:8}},grid:{color:'rgba(196,122,58,0.08)'}}}}});
}
function runAI(){toast('分析機能は現在準備中です');}
