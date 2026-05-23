// ================================================================
// plan.js — 焙煎セッション計画タブ
// ================================================================
// State   : planRows, planPhase
// Public  : renderPlan, addPlanRow, removePlanRow,
//           generatePlanAdvice, backToPlanForm,
//           saveCurrentPlan, applyPlan, deleteSavedPlan
// Internal: renderPlanForm, renderPlanAdviceView, renderPlanRows,
//           renderSavedPlansList, calcRoastOrder, getBeanPlanAdvice,
//           estimateYield, getDetailedAdvice, getPlanSessionWarnings
// ================================================================

let planRows=[];      // [{beanId, amount, roastLevelVal}]
let planPhase='form'; // 'form' | 'advice'

// ===== PUBLIC =====

function renderPlan(){
  const formPhase=document.getElementById('plan-form-phase');
  const advicePhase=document.getElementById('plan-advice-phase');
  if(!formPhase||!advicePhase)return;
  if(planPhase==='form'){
    formPhase.style.display='';
    advicePhase.style.display='none';
    renderPlanForm();
  }else{
    formPhase.style.display='none';
    advicePhase.style.display='';
    renderPlanAdviceView();
  }
}

function addPlanRow(){
  const activeBeans=S.beans.filter(b=>!b.deleted);
  const defaultBeanId=activeBeans.length?activeBeans[0].id:null;
  planRows.push({beanId:defaultBeanId,amount:200,roastLevelVal:1.7});
  renderPlanRows();
}

function removePlanRow(i){
  planRows.splice(i,1);
  renderPlanRows();
}

function generatePlanAdvice(){
  if(!planRows.length){toast('豆を追加してください');return;}
  planPhase='advice';
  renderPlan();
}

function backToPlanForm(){
  planPhase='form';
  renderPlan();
}

// ===== 計画 保存・読み込み =====
const PLANS_KEY='rj_plans';

function loadSavedPlans(){
  try{return JSON.parse(localStorage.getItem(PLANS_KEY)||'[]');}catch{return[];}
}

function saveCurrentPlan(){
  if(!planRows.length){toast('豆を追加してから保存してください');return;}
  const name=prompt('計画名を入力してください',new Date().toLocaleDateString('ja-JP'));
  if(!name)return;
  const dateEl=document.getElementById('plan-date');
  const plans=loadSavedPlans();
  plans.push({id:Date.now(),name,date:dateEl?dateEl.value:'',rows:planRows.map(r=>({...r}))});
  if(plans.length>20)plans.splice(0,plans.length-20);
  localStorage.setItem(PLANS_KEY,JSON.stringify(plans));
  toast('計画を保存しました');
  renderSavedPlansList();
}

function applyPlan(id){
  const plan=loadSavedPlans().find(p=>p.id===id);
  if(!plan)return;
  planRows=plan.rows.map(r=>({...r}));
  const dateEl=document.getElementById('plan-date');
  if(dateEl)dateEl.value=plan.date||'';
  renderPlanRows();
  toast(`「${plan.name}」を読み込みました`);
}

function deleteSavedPlan(id){
  if(!confirm('この計画を削除しますか？'))return;
  const plans=loadSavedPlans().filter(p=>p.id!==id);
  localStorage.setItem(PLANS_KEY,JSON.stringify(plans));
  renderSavedPlansList();
}

function renderSavedPlansList(){
  const el=document.getElementById('plan-saved-list');
  if(!el)return;
  const plans=loadSavedPlans();
  if(!plans.length){el.innerHTML='';return;}
  el.innerHTML='<div class="label" style="margin-bottom:6px;">保存済みの計画</div>'
    +plans.slice().reverse().map(p=>
      `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="flex:1;font-size:var(--fs-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}${p.date?' <span style="color:var(--c-text-muted);font-size:var(--fs-xs);">('+p.date+')</span>':''}</span>
        <button class="btn btn-sm btn-outline" onclick="applyPlan(${p.id})">読み込む</button>
        <button style="background:none;border:none;color:var(--c-danger);cursor:pointer;font-size:16px;padding:0 2px;" onclick="deleteSavedPlan(${p.id})">✕</button>
      </div>`
    ).join('');
}

// ===== INTERNAL =====

function renderPlanForm(){
  const dateEl=document.getElementById('plan-date');
  if(dateEl&&!dateEl.value)dateEl.value=new Date().toISOString().slice(0,10);
  renderSavedPlansList();
  renderPlanRows();
}

function renderPlanRows(){
  const el=document.getElementById('plan-rows');
  if(!el)return;
  const activeBeans=S.beans.filter(b=>!b.deleted);
  if(!planRows.length){
    el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-sm);padding:8px 0;">「+ 豆を追加」で焙煎する豆を追加してください。</div>';
    return;
  }
  el.innerHTML=planRows.map((row,i)=>`
    <div style="display:grid;grid-template-columns:1fr 64px 120px 32px;gap:5px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
      <select class="inp" style="font-size:var(--fs-sm);padding:4px 6px;" onchange="planRows[${i}].beanId=parseInt(this.value)">
        ${activeBeans.map(b=>`<option value="${b.id}"${b.id===row.beanId?' selected':''}>${b.name}${countryName(b.countryId)?' ('+countryName(b.countryId)+')':''}</option>`).join('')}
      </select>
      <input type="number" class="inp" style="font-size:var(--fs-sm);padding:4px 6px;" value="${row.amount}" placeholder="g"
        onchange="planRows[${i}].amount=parseFloat(this.value)||0">
      <select class="inp" style="font-size:var(--fs-sm);padding:4px 6px;" onchange="planRows[${i}].roastLevelVal=parseFloat(this.value)">
        ${ROAST_LEVELS.map(l=>`<option value="${l.val}"${l.val===row.roastLevelVal?' selected':''}>${rlLabel(l.val)}</option>`).join('')}
      </select>
      <button onclick="removePlanRow(${i})" style="background:none;border:none;color:var(--c-danger);cursor:pointer;font-size:17px;padding:0;line-height:1;">✕</button>
    </div>`).join('');
}

function renderPlanAdviceView(){
  const el=document.getElementById('plan-advice-content');
  if(!el)return;

  const dateEl=document.getElementById('plan-date');
  const sessionDate=dateEl&&dateEl.value?dateEl.value:new Date().toISOString().slice(0,10);

  const orderedItems=calcRoastOrder(planRows);
  const warnings=getPlanSessionWarnings(orderedItems);

  let html=`<div class="card"><div class="card-title">📋 焙煎セッション計画</div>`;
  html+=`<div style="color:var(--c-text-muted);font-size:var(--fs-sm);margin-bottom:12px;">📅 ${sessionDate} · ${orderedItems.length}種 · 合計${orderedItems.reduce((a,i)=>a+(i.amount||0),0)}g</div>`;

  html+=`<div class="label" style="margin-bottom:8px;">推奨焙煎順序</div>`;
  orderedItems.forEach((item,idx)=>{
    const bean=S.beans.find(b=>b.id===item.beanId);
    if(!bean)return;
    const levelLabel=rlLabel(item.roastLevelVal);
    const advice=getBeanPlanAdvice(item.beanId,item.roastLevelVal);
    const est=estimateYield(item.beanId,item.roastLevelVal,item.amount);
    const country=countryName(bean.countryId)||(bean.country||'');
    const procs=bean.processIds&&bean.processIds.length?processShortNFromIds(bean.processIds):(bean.processes||[]);
    html+=`<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:600;font-size:var(--fs-sm);">${idx+1}. ${bean.name}</div>
        <span style="font-size:var(--fs-xs);background:var(--c-accent);color:#1a0f07;border-radius:12px;padding:2px 8px;">${levelLabel}</span>
      </div>
      <div style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-bottom:8px;">${[country,...procs].filter(Boolean).join(' / ')} · ${item.amount}g → 仕上がり推定 ${est}g</div>
      ${advice}
    </div>`;
  });

  if(warnings.length){
    html+=`<div class="label" style="margin:12px 0 8px;">⚠ セッション注意事項</div>`;
    warnings.forEach(w=>{
      html+=`<div style="background:rgba(229,85,85,0.08);border:1px solid rgba(229,85,85,0.3);border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:var(--fs-sm);color:var(--c-text);">${w}</div>`;
    });
  }

  html+=`</div>`;

  const geminiKey=typeof getGeminiKey==='function'?getGeminiKey():null;
  if(geminiKey){
    html+=`<div id="plan-ai-section" class="card"><div class="card-title">🤖 AIアドバイス</div><div id="plan-ai-content" style="color:var(--c-text-muted);font-size:var(--fs-sm);">生成中...</div></div>`;
  }

  el.innerHTML=html;

  if(geminiKey)_fetchPlanAiAdvice(orderedItems,sessionDate);
}

async function _fetchPlanAiAdvice(orderedItems,sessionDate){
  const lines=orderedItems.map((item,idx)=>{
    const bean=S.beans.find(b=>b.id===item.beanId);
    if(!bean)return null;
    const country=countryName(bean.countryId)||(bean.country||'');
    const procs=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
    return`${idx+1}. ${bean.name}（${country}、${procs.join('/')||'精製不明'}）${item.amount}g → ${rlLabel(item.roastLevelVal)}`;
  }).filter(Boolean);
  const cacheKey='plan_'+orderedItems.map(i=>`${i.beanId}:${i.roastLevelVal}:${i.amount}`).join(',');
  const prompt=`コーヒー焙煎のセッション計画について専門的なアドバイスを日本語で100字以内で教えてください。\n\n焙煎予定:\n${lines.join('\n')}\n\nポイント: 焙煎順序の妥当性、各豆の注意点、機器の温度管理。`;
  const result=await callGeminiForAnalysis(prompt,cacheKey);
  const el=document.getElementById('plan-ai-content');
  if(el)el.innerHTML=result?`<div style="line-height:1.7;font-size:var(--fs-sm);">${result.replace(/\n/g,'<br>')}</div>`:'<span style="color:var(--c-text-muted);">AIアドバイスを取得できませんでした</span>';
}

// ===== LOGIC =====

function calcRoastOrder(items){
  return [...items].sort((a,b)=>{
    const aWH=_hasWetHulled(a.beanId),bWH=_hasWetHulled(b.beanId);
    if(aWH!==bWH)return aWH?1:-1;
    if(a.roastLevelVal!==b.roastLevelVal)return a.roastLevelVal-b.roastLevelVal;
    const aG=_hasGesha(a.beanId),bG=_hasGesha(b.beanId);
    if(aG!==bG)return aG?-1:1;
    return 0;
  });
}

function _hasWetHulled(beanId){
  const bean=S.beans.find(b=>b.id===beanId);if(!bean)return false;
  const names=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
  return names.some(n=>n.toLowerCase().includes('wet-hull')||n.toLowerCase().includes('スマトラ'));
}

function _hasGesha(beanId){
  const bean=S.beans.find(b=>b.id===beanId);if(!bean)return false;
  const names=bean.varietyIds&&bean.varietyIds.length?varietyNamesFromIds(bean.varietyIds):(bean.varieties||[]);
  return names.some(n=>n.toLowerCase().includes('gesha')||n.toLowerCase().includes('geisha')||n.includes('ゲイシャ'));
}

function getBeanPlanAdvice(beanId,targetLevelVal){
  const bean=S.beans.find(b=>b.id===beanId);
  if(!bean)return '<div style="color:var(--c-text-muted);font-size:var(--fs-sm);">データなし</div>';

  // 過去記録がある場合: 実績データ + 詳細アドバイス
  const pastRoasts=S.roastRecords.filter(r=>!r.deleted&&r.beanId===beanId&&r.roastLevel===targetLevelVal).sort((a,b)=>b.id-a.id);

  let pastHtml='';
  if(pastRoasts.length){
    const r=pastRoasts[0];
    const parts=[];
    if(r.duration)parts.push(`焙煎時間: <b>${Math.floor(r.duration/60)}分${r.duration%60}秒</b>`);
    const dtr=r.dtr!=null?r.dtr:_calcDTRSimple(r);
    if(dtr!=null)parts.push(`DTR: <b>${dtr}%</b>`);
    if(r.yieldPct)parts.push(`歩留: <b>${r.yieldPct}%</b>`);
    const taste=S.tasteRecords.filter(t=>!t.deleted&&t.roastId===r.id).sort((a,b)=>b.id-a.id)[0];
    if(taste&&taste.stars)parts.push(`評価: <b>${'★'.repeat(taste.stars)}</b>`);
    if(parts.length){
      pastHtml=`<div style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-bottom:6px;background:rgba(196,122,58,0.06);border-radius:4px;padding:5px 8px;">
        📊 前回実績: ${parts.join(' / ')}</div>`;
    }
  }

  const detailHtml=getDetailedAdvice(bean,targetLevelVal);
  return pastHtml+detailHtml;
}

function _calcDTRSimple(r){
  const fc=r.events?.find(e=>e.label==='1st Crack Start'||e.label.includes('1ハゼ'));
  if(!fc||!r.duration)return null;
  return Math.round((r.duration-fc.time)/r.duration*1000)/10;
}

function estimateYield(beanId,targetLevelVal,amountG){
  if(!amountG)return 0;
  const pastRoasts=S.roastRecords.filter(r=>!r.deleted&&r.beanId===beanId&&r.yieldPct&&Math.abs((r.roastLevel||0)-targetLevelVal)<0.3);
  if(pastRoasts.length){
    const avgYield=pastRoasts.reduce((a,r)=>a+r.yieldPct,0)/pastRoasts.length;
    return Math.round(amountG*avgYield/100);
  }
  let yieldPct=targetLevelVal<=1.5?87:targetLevelVal<=2.0?84:81;
  return Math.round(amountG*yieldPct/100);
}

function getDetailedAdvice(bean,levelVal){
  const country=countryName(bean.countryId)||(bean.country||'');
  const procs=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
  const varieties=bean.varietyIds&&bean.varietyIds.length?varietyNamesFromIds(bean.varietyIds):(bean.varieties||[]);

  // 産地別チャージ温度・特性
  const isEthiopia=country.includes('エチオピア');
  const isKenya=country.includes('ケニア');
  const isIndonesia=country.includes('インドネシア')||country.includes('スマトラ');
  const isCentralAmerica=['グアテマラ','コロンビア','コスタリカ','エルサルバドル','ホンジュラス','ニカラグア','メキシコ','パナマ'].some(c=>country.includes(c));
  const isYemen=country.includes('イエメン');
  const isRwanda=country.includes('ルワンダ');
  const isBrazil=country.includes('ブラジル');

  // 精製別
  const isNatural=procs.some(p=>p.toLowerCase().includes('natural')||p.includes('ナチュラル'));
  const isAnaerobic=procs.some(p=>p.toLowerCase().includes('anaerobic')||p.includes('アナエロビック'));
  const isWetHulled=procs.some(p=>p.toLowerCase().includes('wet-hull')||p.includes('スマトラ'));
  const isHoney=procs.some(p=>p.toLowerCase().includes('honey')||p.includes('ハニー'));
  const isCarbonic=procs.some(p=>p.toLowerCase().includes('carbonic')||p.includes('カーボニック'));

  // 品種別
  const isGesha=varieties.some(v=>v.toLowerCase().includes('gesha')||v.toLowerCase().includes('geisha')||v.includes('ゲイシャ'));
  const isSL=varieties.some(v=>v.toUpperCase().includes('SL28')||v.toUpperCase().includes('SL34'));
  const isPacamara=varieties.some(v=>v.toLowerCase().includes('pacamara')||v.includes('パカマラ'));

  // 焙煎度グループ
  const isLight=levelVal<=1.5;   // ライト〜ミディアム
  const isMedium=levelVal<=2.0;  // ハイ〜シティ
  const isDark=levelVal>2.0;     // フルシティ以上

  // ===== 目標値 =====
  const [ftLo,ftHi]=typeof getFinishTempRange==='function'?getFinishTempRange(levelVal):[200+levelVal*5,210+levelVal*5];
  const estTime=isLight?'10〜12分':isMedium?'12〜14分':'14〜16分';

  // チャージ温度（産地密度別）
  let chargeTempRange='200〜210°C';
  if(isKenya||isSL||isPacamara)chargeTempRange='215〜225°C'; // 高密度
  else if(isEthiopia||isRwanda)chargeTempRange='210〜220°C'; // 中〜高密度
  else if(isIndonesia||isWetHulled)chargeTempRange='190〜200°C'; // 水分多め
  else if(isBrazil)chargeTempRange='195〜205°C'; // 低密度
  else if(isYemen)chargeTempRange='210〜220°C';

  // ===== フェーズ別アドバイス =====
  // 前半（乾燥期〜メイラード）
  let phase1='乾燥期（〜4分）: 中火で水分を飛ばす。';
  if(isWetHulled)phase1='乾燥期（〜5分）: 水分が多いため弱火でゆっくり乾燥させる。煙に注意。';
  else if(isNatural||isHoney)phase1='乾燥期（〜4分）: 残糖分が焦げやすいため、火力は控えめからスタート。';
  else if(isAnaerobic||isCarbonic)phase1='乾燥期（〜4分）: 発酵由来の複雑な揮発成分が多い。低火力で丁寧に。';

  // 中盤（メイラード〜1ハゼ）
  const targetFCTime=isLight?'65〜75%':isMedium?'65〜75%':'60〜70%';
  let phase2=`メイラード期から徐々に火力を上げ、1ハゼを焙煎時間の${targetFCTime}付近（目安 ${estTime.split('〜')[0]}強）に合わせる。`;
  if(isKenya||isSL)phase2+=` ケニア・SL系は豆密度が高く1ハゼが鋭い。RORが急落しないよう熱量を安定させる。`;
  else if(isEthiopia&&!isNatural)phase2+=` エチオピアウォッシュドは花やかな酸味が特徴。1ハゼ前の温度上昇をROR ${isLight?'8〜12':'10〜14'}°C/分程度に保つ。`;
  else if(isGesha)phase2+=` ゲイシャ系は繊細で風味が飛びやすい。急激な火力アップは避け、穏やかな温度上昇を心がける。`;
  if(isNatural)phase2+=` ナチュラルはメイラード反応が早く進みやすい。焙煎度が予想より深まらないよう注意。`;

  // 後半（1ハゼ〜排出）
  const targetDTR=isLight?'20〜25':'18〜22';
  let phase3=`1ハゼ後はDTR ${targetDTR}% 目標で発展時間を管理。仕上がり温度 ${ftLo}〜${ftHi}°C で排出。`;
  if(isDark)phase3+=` 2ハゼに向けて火力を落とし、RORをコントロール。排煙・換気を確保する。`;
  if(isAnaerobic||isCarbonic)phase3+=` 発酵フレーバーを活かすには発展時間を短め（DTR 18〜20%）に抑えると効果的。`;
  if(isGesha)phase3+=` ゲイシャは浅めの発展で独自の花果実フレーバーが引き立つ。`;

  const rows=[
    ['目標',`仕上がり ${ftLo}〜${ftHi}°C / 推定時間 ${estTime} / チャージ目安 ${chargeTempRange}`],
    ['前半',phase1],
    ['中盤',phase2],
    ['後半',phase3],
  ];

  const tableHtml=rows.map(([h,v])=>
    `<div style="display:grid;grid-template-columns:36px 1fr;gap:6px;padding:4px 0;border-bottom:1px solid rgba(196,122,58,0.1);">
      <span style="font-size:var(--fs-xs);font-weight:700;color:var(--c-accent);white-space:nowrap;">${h}</span>
      <span style="font-size:var(--fs-xs);color:var(--c-text);line-height:1.6;">${v}</span>
    </div>`
  ).join('');

  return`<div style="font-size:var(--fs-xs);">${tableHtml}</div>`;
}

function getPlanSessionWarnings(orderedItems){
  const warnings=[];
  if(!orderedItems.length)return warnings;
  for(let i=1;i<orderedItems.length;i++){
    if(orderedItems[i].roastLevelVal<orderedItems[i-1].roastLevelVal){
      const prev=S.beans.find(b=>b.id===orderedItems[i-1].beanId);
      const curr=S.beans.find(b=>b.id===orderedItems[i].beanId);
      warnings.push(`深煎り（${prev?prev.name:'前の豆'}）の後に浅煎り（${curr?curr.name:'次の豆'}）を焙煎します。ドラム内の残熱に注意してください。`);
    }
  }
  if(orderedItems.some(item=>_hasWetHulled(item.beanId))){
    warnings.push('スマトラ式（Wet-Hulled）の豆は水分が多いため、最後に焙煎するか機器の温度安定を確認してください。');
  }
  const totalAmount=orderedItems.reduce((a,item)=>a+(item.amount||0),0);
  if(totalAmount>1000)warnings.push(`セッション総投入量が${totalAmount}gです。機器の容量を超えないよう確認してください。`);
  if(orderedItems.length>=4)warnings.push(`${orderedItems.length}種類の豆を連続焙煎します。各バッチ間に適切な冷却時間（10〜15分）を設けてください。`);
  return warnings;
}

// ===== AI キャッシュ =====
const AI_CACHE_KEY='rj_ai_cache';

function _getAiCache(key){
  try{const cache=JSON.parse(localStorage.getItem(AI_CACHE_KEY)||'{}');return cache[key]??null;}catch{return null;}
}

function _setAiCache(key,value){
  try{
    const cache=JSON.parse(localStorage.getItem(AI_CACHE_KEY)||'{}');
    cache[key]=value;
    const keys=Object.keys(cache);
    if(keys.length>100)keys.slice(0,keys.length-100).forEach(k=>delete cache[k]);
    localStorage.setItem(AI_CACHE_KEY,JSON.stringify(cache));
  }catch(e){console.warn('AI cache write error:',e);}
}

// ===== Gemini API =====
async function callGeminiForAnalysis(prompt,cacheKey){
  if(cacheKey){const cached=_getAiCache(cacheKey);if(cached)return cached;}
  const key=typeof getGeminiKey==='function'?getGeminiKey():null;
  if(!key)return null;
  try{
    const res=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:256}})}
    );
    const d=await res.json();
    const text=d.candidates?.[0]?.content?.parts?.[0]?.text??null;
    if(text&&cacheKey)_setAiCache(cacheKey,text);
    return text;
  }catch(e){console.warn('Gemini API error:',e);return null;}
}
