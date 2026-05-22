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
  const statsItems=`<span class="rec-s">時間: <span>${Math.floor(r.duration/60)}分${r.duration%60}秒</span></span>${r.roastLevel?`<span class="rec-s">焙煎度: <span>${rlLabel(r.roastLevel)}</span></span>`:''}${bestStars?`<span class="rec-s">評価: <span>${'★'.repeat(bestStars)}</span></span>`:''}`;
  if(showBean){
    // 日付別: 豆名のみ（日付はグループヘッダーに出るため非表示）
    return`<div class="rec" onclick="openRecordModal(${r.id})"><div class="rec-hd"><div class="rec-bean">${beanLabel}</div></div><div class="rec-stats">${statsItems}</div></div>`;
  }else{
    // 豆別: 日付＋statsを1行に並べる
    return`<div class="rec" onclick="openRecordModal(${r.id})"><div class="rec-stats" style="margin-top:0;"><span class="rec-s" style="color:var(--c-text);font-weight:600;margin-right:4px;">${dateLabel}</span>${statsItems}</div></div>`;
  }
}
function renderRecords(){
  const el=document.getElementById('records-list');if(!el)return;
  const activeRecords=S.roastRecords.filter(r=>!r.deleted);
  if(!activeRecords.length){el.innerHTML='<div class="empty">焙煎記録がありません</div>';return;}
  const sorted=activeRecords.slice().sort((a,b)=>b.id-a.id);
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
  const tastes=S.tasteRecords.filter(t=>t.roastId===r.id&&!t.deleted).sort((a,b)=>a.id-b.id);
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
  const ts=new Date().toISOString();
  const ri=S.roastRecords.findIndex(r=>r.id===id);
  if(ri>=0)S.roastRecords[ri]={...S.roastRecords[ri],deleted:true,updatedAt:ts};
  S.tasteRecords.filter(t=>t.roastId===id).forEach(t=>{
    const ti=S.tasteRecords.findIndex(x=>x.id===t.id);
    if(ti>=0)S.tasteRecords[ti]={...S.tasteRecords[ti],deleted:true,updatedAt:ts};
  });
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
  S.roastRecords[idx]={...S.roastRecords[idx],roastLevel:rl,weightBefore:wb,weightAfter:wa,yieldPct,memo:document.getElementById('er-memo').value,events:JSON.parse(JSON.stringify(erEventBuf)),tempData:erTempBuf.map(t=>t.temp),timeData:erTempBuf.map(t=>t.time),updatedAt:new Date().toISOString()};
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
  switchAnalysisSubtab('eval');
}

function switchAnalysisSubtab(name){
  ['eval','session','trend'].forEach(n=>{
    const pane=document.getElementById('analysis-subtab-'+n);
    if(pane)pane.style.display=n===name?'':'none';
    const btn=document.getElementById('asubtab-btn-'+n);
    if(btn){btn.style.fontWeight=n===name?'700':'400';
             btn.style.borderColor=n===name?'var(--c-accent)':'var(--border)';}
  });
  if(name==='eval')   renderRoastEvalSubtab();
  if(name==='session')renderSessionEvalSubtab();
  if(name==='trend')  renderTrendSubtab();
}

// ----- 傾向分析（旧コンテンツ） -----
function renderTrendSubtab(){
  const ar=S.roastRecords.filter(r=>!r.deleted);
  const ab=S.beans.filter(b=>!b.deleted);
  const at=S.tasteRecords.filter(t=>!t.deleted);
  document.getElementById('analysis-stats').innerHTML=`<div class="a-stat"><span class="a-lbl">総焙煎回数</span><span class="a-val">${ar.length} 回</span></div><div class="a-stat"><span class="a-lbl">登録豆数</span><span class="a-val">${ab.length} 種</span></div><div class="a-stat"><span class="a-lbl">味わい記録数</span><span class="a-val">${at.length} 件</span></div><div class="a-stat"><span class="a-lbl">平均焙煎時間</span><span class="a-val">${ar.length?Math.round(ar.reduce((a,r)=>a+r.duration,0)/ar.length)+'秒':'—'}</span></div>`;
  renderAnalysisChart();renderCompareSection();
}
function renderAnalysisChart(){
  const ctx=document.getElementById('analysis-chart');if(!ctx)return;
  if(analysisChart)analysisChart.destroy();
  const activeBeans=S.beans.filter(b=>!b.deleted);
  const labels=activeBeans.map(b=>b.name);const counts=activeBeans.map(b=>S.roastRecords.filter(r=>r.beanId===b.id&&!r.deleted).length);
  analysisChart=new Chart(ctx.getContext('2d'),{type:'bar',data:{labels:labels.length?labels:['データなし'],datasets:[{label:'焙煎回数',data:counts.length?counts:[0],backgroundColor:'rgba(196,122,58,0.5)',borderColor:'#c47a3a',borderWidth:1}]},options:{responsive:true,plugins:{legend:{labels:{color:'#a07850',font:{size:10}}}},scales:{x:{ticks:{color:'#a07850',font:{size:9}},grid:{color:'rgba(196,122,58,0.08)'}},y:{ticks:{color:'#a07850',font:{size:9}},grid:{color:'rgba(196,122,58,0.08)'}}}}});
}
function renderCompareSection(){
  const el=document.getElementById('compare-checks');if(!el)return;
  const activeRecs=S.roastRecords.filter(r=>!r.deleted);
  if(!activeRecs.length){el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-sm);">焙煎記録がありません</div>';return;}
  el.innerHTML=activeRecs.slice().reverse().map(r=>{const b=S.beans.find(b=>b.id===r.beanId&&!b.deleted);return`<div class="compare-check"><input type="checkbox" id="cmp-${r.id}" value="${r.id}" onchange="updateCompareChart()"><label for="cmp-${r.id}" style="font-size:var(--fs-sm);color:var(--c-text);cursor:pointer;">${b?b.name:'不明'} (${new Date(r.startTime).toLocaleDateString('ja-JP')})</label></div>`;}).join('');
}
function updateCompareChart(){
  const checked=[...document.querySelectorAll('#compare-checks input:checked')].map(el=>parseInt(el.value));
  const ctx=document.getElementById('compare-chart');if(!ctx)return;
  if(compareChart)compareChart.destroy();
  const colors=['#c47a3a','#5a8a3a','#7ab3f5','#e06040','#e8a040','var(--c-green)'];
  const datasets=checked.map((id,i)=>{const r=S.roastRecords.find(r=>r.id===id);const b=S.beans.find(b=>b.id===r.beanId);return{label:(b?b.name:'不明')+' ('+new Date(r.startTime).toLocaleDateString('ja-JP')+')',data:r.tempData,borderColor:colors[i%colors.length],backgroundColor:'transparent',borderWidth:2,pointRadius:1,tension:0.4,fill:false};});
  const labels=checked.length?S.roastRecords.find(r=>r.id===checked[0]).timeData.map(t=>ft(t)):[];
  compareChart=new Chart(ctx.getContext('2d'),{type:'line',data:{labels,datasets},options:{responsive:true,plugins:{legend:{labels:{color:'#a07850',font:{size:9}}}},scales:{x:{ticks:{color:'#a07850',font:{size:8},maxTicksLimit:8},grid:{color:'rgba(196,122,58,0.08)'}},y:{ticks:{color:'#a07850',font:{size:8}},grid:{color:'rgba(196,122,58,0.08)'}}}}});
}

// ----- 焙煎評価 -----
function renderRoastEvalSubtab(){
  const sel=document.getElementById('eval-roast-select');if(!sel)return;
  const activeRecs=S.roastRecords.filter(r=>!r.deleted).slice().sort((a,b)=>b.id-a.id);
  sel.innerHTML='<option value="">-- 記録を選択 --</option>'+activeRecs.map(r=>{
    const b=S.beans.find(b=>b.id===r.beanId);
    const dateStr=new Date(r.startTime).toLocaleDateString('ja-JP');
    return`<option value="${r.id}">${dateStr} — ${b?b.name:'不明'}</option>`;
  }).join('');
  document.getElementById('eval-result').innerHTML='';
}

function onEvalRoastSelect(){
  const sel=document.getElementById('eval-roast-select');
  const id=parseInt(sel.value);
  const el=document.getElementById('eval-result');
  if(!id){el.innerHTML='';return;}
  const r=S.roastRecords.find(r=>r.id===id);
  if(!r){el.innerHTML='';return;}
  const result=scoreRoast(r);
  const {label,color}=getRoastScoreLabel(result.total);
  let html=`<div style="text-align:center;margin-bottom:16px;"><div style="font-size:2.4rem;font-weight:700;color:${color};">${result.total}</div><div style="font-size:var(--fs-sm);color:${color};font-weight:600;">${label} / 100点</div></div>`;
  html+=`<div class="sync-info" style="margin-bottom:12px;">`;
  result.breakdown.forEach(item=>{
    html+=`<div class="sync-row"><span class="sync-label">${item.label}</span><span class="sync-val" style="color:${item.score>=16?'var(--c-green)':item.score>=10?'#f5a623':'#e55'};">${item.score}/20点 <span style="font-size:var(--fs-xs);color:var(--c-text-muted);">${item.note}</span></span></div>`;
  });
  html+=`</div>`;
  if(result.tags.length){
    html+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">`;
    result.tags.forEach(tag=>{html+=`<span style="background:rgba(196,122,58,0.15);color:var(--c-accent);border-radius:12px;padding:3px 10px;font-size:var(--fs-xs);">${tag}</span>`;});
    html+=`</div>`;
  }
  if(result.comments.length){
    html+=`<div style="font-size:var(--fs-sm);color:var(--c-text);line-height:1.7;">${result.comments.join('<br>')}</div>`;
  }
  el.innerHTML=html;

  // Gemini AI追記
  const geminiKey=typeof getGeminiKey==='function'?getGeminiKey():null;
  if(geminiKey){
    el.innerHTML+=`<div id="eval-ai-section" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"><div style="font-weight:600;font-size:var(--fs-sm);margin-bottom:6px;">🤖 AIコメント</div><div id="eval-ai-content" style="color:var(--c-text-muted);font-size:var(--fs-sm);">生成中...</div></div>`;
    _fetchEvalAiComment(r,result);
  }
}

async function _fetchEvalAiComment(r,result){
  const b=S.beans.find(b=>b.id===r.beanId);
  const beanName=b?b.name:'不明';
  // キャッシュキー: 焙煎記録IDとスコアの組み合わせ（記録編集後にスコアが変わったら再取得）
  const cacheKey=`eval_${r.id}_${result.total}`;
  const prompt=`焙煎記録のスコアは${result.total}/100点（${getRoastScoreLabel(result.total).label}）です。豆: ${beanName}。内訳: ${result.breakdown.map(x=>x.label+x.score+'点').join(', ')}。この焙煎の改善点を日本語で50字以内で教えてください。`;
  const text=await callGeminiForAnalysis(prompt,cacheKey);
  const el=document.getElementById('eval-ai-content');
  if(el)el.innerHTML=text?`<div style="line-height:1.7;">${text.replace(/\n/g,'<br>')}</div>`:'<span style="color:var(--c-text-muted);">コメントを取得できませんでした</span>';
}

function scoreRoast(r){
  const breakdown=[];
  const tags=[];
  const comments=[];
  let total=0;

  // 1. DTR
  const dtr=r.dtr!=null?r.dtr:calcDTR(r);
  let dtrScore=8,dtrNote='データなし';
  if(dtr!=null){
    if(dtr>=18&&dtr<=25){dtrScore=20;dtrNote=dtr+'%（良好）';}
    else if(dtr>=15&&dtr<=28){dtrScore=14;dtrNote=dtr+'%（許容範囲）';}
    else{dtrScore=8;dtrNote=dtr+'%（範囲外）';}
    if(dtr<15)comments.push('DTRが短すぎます。発展時間を延ばすと風味が向上します。');
    if(dtr>28)comments.push('DTRが長すぎます。発展時間が長いと焦げ味が出やすくなります。');
  }
  breakdown.push({label:'DTR（発展時間率）',score:dtrScore,note:dtrNote});
  total+=dtrScore;

  // 2. 重量減少率
  let wlScore=8,wlNote='データなし';
  if(r.yieldPct&&r.roastLevel){
    const loss=100-r.yieldPct;
    const [lo,hi]=getWeightLossRange(r.roastLevel);
    if(loss>=lo&&loss<=hi){wlScore=20;wlNote=loss.toFixed(1)+'%（良好）';}
    else{const d=Math.min(Math.abs(loss-lo),Math.abs(loss-hi));wlScore=Math.max(0,20-d*2|0);wlNote=loss.toFixed(1)+'%（目標'+lo+'-'+hi+'%）';}
  }
  breakdown.push({label:'重量減少率',score:wlScore,note:wlNote});
  total+=wlScore;

  // 3. 1ハゼ温度
  const fc=r.events?.find(e=>e.label==='1st Crack Start'||e.label.includes('1ハゼ開始')||e.label.includes('1st crack'));
  let fcTempScore=8,fcTempNote='データなし';
  if(fc&&fc.temp){
    const t=fc.temp;
    if(t>=195&&t<=215){fcTempScore=20;fcTempNote=t+'°C（良好）';}
    else{const d=Math.min(Math.abs(t-195),Math.abs(t-215));fcTempScore=Math.max(0,20-d|0);fcTempNote=t+'°C（目標195-215°C）';}
  }
  breakdown.push({label:'1ハゼ温度',score:fcTempScore,note:fcTempNote});
  total+=fcTempScore;

  // 4. 1ハゼタイミング
  let fcTimeScore=8,fcTimeNote='データなし';
  if(fc&&r.duration&&r.duration>0){
    const ratio=fc.time/r.duration*100;
    if(ratio>=65&&ratio<=80){fcTimeScore=20;fcTimeNote=ratio.toFixed(0)+'%（良好）';}
    else{const d=Math.min(Math.abs(ratio-65),Math.abs(ratio-80));fcTimeScore=Math.max(0,20-d|0);fcTimeNote=ratio.toFixed(0)+'%（目標65-80%）';}
  }
  breakdown.push({label:'1ハゼタイミング',score:fcTimeScore,note:fcTimeNote});
  total+=fcTimeScore;

  // 5. 仕上がり温度
  let ftScore=8,ftNote='データなし';
  if(r.finalTemp&&r.roastLevel){
    const [lo,hi]=getFinishTempRange(r.roastLevel);
    const t=r.finalTemp;
    if(t>=lo&&t<=hi){ftScore=20;ftNote=t+'°C（良好）';}
    else{const d=Math.min(Math.abs(t-lo),Math.abs(t-hi));ftScore=Math.max(0,20-d|0);ftNote=t+'°C（目標'+lo+'-'+hi+'°C）';}
  }
  breakdown.push({label:'仕上がり温度',score:ftScore,note:ftNote});
  total+=ftScore;

  // タグ
  if(total>=80)tags.push('良い焙煎');
  if(dtrScore===20)tags.push('DTR最適');
  if(wlScore===20)tags.push('歩留良好');
  if(fcTempScore===20)tags.push('1ハゼ温度◎');
  if(fcTimeScore===20)tags.push('タイミング良好');

  return{total,breakdown,tags,comments};
}

function calcDTR(r){
  const fc=r.events?.find(e=>e.label==='1st Crack Start'||e.label.includes('1ハゼ開始'));
  if(!fc||!r.duration)return null;
  return Math.round((r.duration-fc.time)/r.duration*1000)/10;
}

function getFinishTempRange(lv){
  if(lv<=1.0)return[195,205];
  if(lv<=1.2)return[197,207];
  if(lv<=1.5)return[200,210];
  if(lv<=1.7)return[205,215];
  if(lv<=2.0)return[210,220];
  if(lv<=2.2)return[215,225];
  if(lv<=2.5)return[220,228];
  return[224,235];
}

function getWeightLossRange(lv){
  if(lv<=1.5)return[13,17];
  if(lv<=2.0)return[15,19];
  return[18,22];
}

function getRoastScoreLabel(score){
  if(score>=80)return{label:'良好',color:'var(--c-green)'};
  if(score>=60)return{label:'普通',color:'#f5a623'};
  return{label:'要改善',color:'#e55'};
}

// ----- セッション評価 -----
function renderSessionEvalSubtab(){
  const sel=document.getElementById('session-date-select');if(!sel)return;
  const dates=getSessionDates();
  sel.innerHTML='<option value="">-- 日付を選択 --</option>'+dates.map(d=>`<option value="${d}">${d}</option>`).join('');
  document.getElementById('session-result').innerHTML='';
}

function onSessionDateSelect(){
  const sel=document.getElementById('session-date-select');
  const date=sel.value;
  const el=document.getElementById('session-result');
  if(!date){el.innerHTML='';return;}
  const recs=S.roastRecords.filter(r=>!r.deleted&&r.startTime&&r.startTime.startsWith(date));
  if(!recs.length){el.innerHTML='<div style="color:var(--c-text-muted);">この日の焙煎記録はありません</div>';return;}
  const {items,warnings}=evaluateSession(recs);
  let html='';
  // 各記録の評価
  items.forEach((item,idx)=>{
    const b=S.beans.find(b=>b.id===item.r.beanId);
    const beanName=b?b.name:'不明';
    const {total}=scoreRoast(item.r);
    const {label,color}=getRoastScoreLabel(total);
    html+=`<div class="sync-info" style="margin-bottom:10px;"><div class="sync-row"><span class="sync-label" style="font-weight:600;">${idx+1}. ${beanName}</span><span class="sync-val" style="color:${color};font-weight:700;">${total}点 (${label})</span></div>`;
    if(item.tags.length){html+=`<div class="sync-row"><span class="sync-label">タグ</span><span class="sync-val">${item.tags.join(' · ')}</span></div>`;}
    html+=`</div>`;
  });
  // セッション全体警告
  if(warnings.length){
    html+=`<div class="label" style="margin:12px 0 8px;">⚠ セッション評価</div>`;
    warnings.forEach(w=>{
      html+=`<div style="background:rgba(229,85,85,0.08);border:1px solid rgba(229,85,85,0.3);border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:var(--fs-sm);">${w}</div>`;
    });
  }
  // セッション平均スコア
  const avgScore=Math.round(items.reduce((a,item)=>a+scoreRoast(item.r).total,0)/items.length);
  html=`<div style="text-align:center;margin-bottom:14px;"><div style="font-size:1.8rem;font-weight:700;color:${getRoastScoreLabel(avgScore).color};">${avgScore}</div><div style="font-size:var(--fs-sm);color:var(--c-text-muted);">セッション平均スコア</div></div>`+html;
  el.innerHTML=html;
}

function getSessionDates(){
  const dates=[...new Set(S.roastRecords.filter(r=>!r.deleted&&r.startTime).map(r=>r.startTime.slice(0,10)))];
  return dates.sort((a,b)=>b.localeCompare(a));
}

function evaluateSession(records){
  const items=records.map(r=>{
    const result=scoreRoast(r);
    return{r,tags:result.tags,score:result.total};
  });
  const warnings=[];
  // 焙煎度の逆転チェック
  const sorted=records.slice().sort((a,b)=>a.id-b.id);
  for(let i=1;i<sorted.length;i++){
    const prev=sorted[i-1],curr=sorted[i];
    if(prev.roastLevel&&curr.roastLevel&&curr.roastLevel<prev.roastLevel){
      const pb=S.beans.find(b=>b.id===prev.beanId);
      const cb=S.beans.find(b=>b.id===curr.beanId);
      warnings.push(`${pb?pb.name:'前の豆'}（深）→ ${cb?cb.name:'次の豆'}（浅）の順で焙煎。残熱の影響に注意`);
    }
  }
  const avgScore=Math.round(items.reduce((a,i)=>a+i.score,0)/items.length);
  if(avgScore<60)warnings.push('セッション平均スコアが低めです。各パラメータの見直しをおすすめします。');
  return{items,warnings};
}

function runAI(){toast('分析機能は現在準備中です');}
