// ================================================================
// plan.js — 焙煎セッション計画タブ
// ================================================================
// State   : planRows, planPhase
// Public  : renderPlan, addPlanRow, removePlanRow,
//           generatePlanAdvice, backToPlanForm
// Internal: renderPlanForm, renderPlanAdviceView, renderPlanRows,
//           calcRoastOrder, getBeanPlanAdvice, estimateYield,
//           getDefaultAdvice, getPlanSessionWarnings
// ================================================================

const PLAN_LEVELS=[
  {label:'浅煎り',  val:1.2},
  {label:'中浅煎り',val:1.5},
  {label:'中煎り',  val:1.7},
  {label:'中深煎り',val:2.0},
  {label:'深煎り',  val:2.2},
];

let planRows=[];   // [{beanId, amount, roastLevelVal}]
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

// ===== INTERNAL =====

function renderPlanForm(){
  // セッション日の初期値（今日）
  const dateEl=document.getElementById('plan-date');
  if(dateEl&&!dateEl.value){
    dateEl.value=new Date().toISOString().slice(0,10);
  }
  renderPlanRows();
}

function renderPlanRows(){
  const el=document.getElementById('plan-rows');
  if(!el)return;
  const activeBeans=S.beans.filter(b=>!b.deleted);
  if(!planRows.length){
    el.innerHTML='<div style="color:var(--c-text-muted);font-size:var(--fs-sm);padding:8px 0;">豆がありません。「+ 豆を追加」で追加してください。</div>';
    return;
  }
  const beanOptions=activeBeans.map(b=>`<option value="${b.id}">${b.name}${countryName(b.countryId)?' ('+countryName(b.countryId)+')':''}</option>`).join('');
  const levelOptions=PLAN_LEVELS.map(l=>`<option value="${l.val}">${l.label}</option>`).join('');
  el.innerHTML=planRows.map((row,i)=>`
    <div style="display:grid;grid-template-columns:1fr 72px 100px 36px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
      <select class="inp" style="font-size:var(--fs-sm);padding:5px 8px;" onchange="planRows[${i}].beanId=parseInt(this.value)">
        ${activeBeans.map(b=>`<option value="${b.id}"${b.id===row.beanId?' selected':''}>${b.name}${countryName(b.countryId)?' ('+countryName(b.countryId)+')':''}</option>`).join('')}
      </select>
      <input type="number" class="inp" style="font-size:var(--fs-sm);padding:5px 8px;" value="${row.amount}" placeholder="g"
        onchange="planRows[${i}].amount=parseFloat(this.value)||0">
      <select class="inp" style="font-size:var(--fs-sm);padding:5px 8px;" onchange="planRows[${i}].roastLevelVal=parseFloat(this.value)">
        ${PLAN_LEVELS.map(l=>`<option value="${l.val}"${l.val===row.roastLevelVal?' selected':''}>${l.label}</option>`).join('')}
      </select>
      <button onclick="removePlanRow(${i})" style="background:none;border:none;color:var(--c-danger);cursor:pointer;font-size:18px;padding:0;line-height:1;">✕</button>
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
  html+=`<div style="color:var(--c-text-muted);font-size:var(--fs-sm);margin-bottom:12px;">📅 ${sessionDate}</div>`;

  // 焙煎順序
  html+=`<div class="label" style="margin-bottom:8px;">推奨焙煎順序</div>`;
  orderedItems.forEach((item,idx)=>{
    const bean=S.beans.find(b=>b.id===item.beanId);
    if(!bean)return;
    const levelLabel=PLAN_LEVELS.find(l=>l.val===item.roastLevelVal)?.label||'—';
    const advice=getBeanPlanAdvice(item.beanId,item.roastLevelVal);
    const est=estimateYield(item.beanId,item.roastLevelVal,item.amount);
    const country=countryName(bean.countryId)||(bean.country||'');
    const procs=bean.processIds&&bean.processIds.length?processShortNFromIds(bean.processIds):(bean.processes||[]);
    html+=`<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:600;font-size:var(--fs-sm);">${idx+1}. ${bean.name}</div>
        <span style="font-size:var(--fs-xs);background:var(--c-accent);color:#1a0f07;border-radius:12px;padding:2px 8px;">${levelLabel}</span>
      </div>
      <div style="font-size:var(--fs-xs);color:var(--c-text-muted);margin-bottom:6px;">${[country,...procs].filter(Boolean).join(' / ')} · ${item.amount}g → 仕上がり推定 ${est}g</div>
      <div style="font-size:var(--fs-sm);color:var(--c-text);line-height:1.6;">${advice}</div>
    </div>`;
  });

  // 警告
  if(warnings.length){
    html+=`<div class="label" style="margin:12px 0 8px;">⚠ セッション注意事項</div>`;
    warnings.forEach(w=>{
      html+=`<div style="background:rgba(229,85,85,0.08);border:1px solid rgba(229,85,85,0.3);border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:var(--fs-sm);color:var(--c-text);">${w}</div>`;
    });
  }

  html+=`</div>`;

  // Gemini AIアドバイス（非同期で追記）
  const geminiKey=typeof getGeminiKey==='function'?getGeminiKey():null;
  if(geminiKey){
    html+=`<div id="plan-ai-section" class="card"><div class="card-title">🤖 AIアドバイス</div><div id="plan-ai-content" style="color:var(--c-text-muted);font-size:var(--fs-sm);">生成中...</div></div>`;
  }

  el.innerHTML=html;

  // Gemini非同期呼び出し
  if(geminiKey){
    _fetchPlanAiAdvice(orderedItems,sessionDate);
  }
}

async function _fetchPlanAiAdvice(orderedItems,sessionDate){
  const lines=orderedItems.map((item,idx)=>{
    const bean=S.beans.find(b=>b.id===item.beanId);
    if(!bean)return null;
    const levelLabel=PLAN_LEVELS.find(l=>l.val===item.roastLevelVal)?.label||'—';
    const country=countryName(bean.countryId)||(bean.country||'');
    const procs=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
    return`${idx+1}. ${bean.name}（${country}、${procs.join('/')||'精製不明'}）${item.amount}g → ${levelLabel}`;
  }).filter(Boolean);
  const prompt=`コーヒー焙煎のセッション計画について、専門的なアドバイスを日本語で100字以内で教えてください。\n\n焙煎予定:\n${lines.join('\n')}\n\nポイント: 焙煎順序の妥当性、各豆の注意点、機器の温度管理について簡潔にコメントしてください。`;
  const result=await callGeminiForAnalysis(prompt);
  const el=document.getElementById('plan-ai-content');
  if(el)el.innerHTML=result?`<div style="line-height:1.7;font-size:var(--fs-sm);">${result.replace(/\n/g,'<br>')}</div>`:'<span style="color:var(--c-text-muted);">AIアドバイスを取得できませんでした</span>';
}

// ===== LOGIC =====

function calcRoastOrder(items){
  return [...items].sort((a,b)=>{
    // Wet-Hulledは最後
    const aWH=_hasWetHulled(a.beanId);
    const bWH=_hasWetHulled(b.beanId);
    if(aWH!==bWH)return aWH?1:-1;
    // 焙煎度昇順
    if(a.roastLevelVal!==b.roastLevelVal)return a.roastLevelVal-b.roastLevelVal;
    // 同一レベル内ではゲイシャ優先
    const aG=_hasGesha(a.beanId);
    const bG=_hasGesha(b.beanId);
    if(aG!==bG)return aG?-1:1;
    return 0;
  });
}

function _hasWetHulled(beanId){
  const bean=S.beans.find(b=>b.id===beanId);
  if(!bean)return false;
  const names=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
  return names.some(n=>n.toLowerCase().includes('wet-hull')||n.toLowerCase().includes('スマトラ'));
}

function _hasGesha(beanId){
  const bean=S.beans.find(b=>b.id===beanId);
  if(!bean)return false;
  const names=bean.varietyIds&&bean.varietyIds.length?varietyNamesFromIds(bean.varietyIds):(bean.varieties||[]);
  return names.some(n=>n.toLowerCase().includes('gesha')||n.toLowerCase().includes('geisha')||n.includes('ゲイシャ'));
}

function getBeanPlanAdvice(beanId,targetLevelVal){
  const bean=S.beans.find(b=>b.id===beanId);
  if(!bean)return 'データなし';

  // 過去の焙煎記録から同一豆・同一焙煎度を検索
  const pastRoasts=S.roastRecords.filter(r=>!r.deleted&&r.beanId===beanId&&r.roastLevel===targetLevelVal).sort((a,b)=>b.id-a.id);

  if(pastRoasts.length){
    const r=pastRoasts[0];
    const parts=[];
    if(r.duration)parts.push(`前回の焙煎時間: ${Math.floor(r.duration/60)}分${r.duration%60}秒`);
    if(r.dtr!=null)parts.push(`DTR: ${r.dtr}%`);
    if(r.yieldPct)parts.push(`歩留: ${r.yieldPct}%`);
    const taste=S.tasteRecords.filter(t=>!t.deleted&&t.roastId===r.id).sort((a,b)=>b.id-a.id)[0];
    if(taste&&taste.stars)parts.push(`評価: ${'★'.repeat(taste.stars)}`);
    return parts.length?'過去データ: '+parts.join(' / '):getDefaultAdvice(bean,PLAN_LEVELS.find(l=>l.val===targetLevelVal)?.label||'—');
  }

  return getDefaultAdvice(bean,PLAN_LEVELS.find(l=>l.val===targetLevelVal)?.label||'—');
}

function estimateYield(beanId,targetLevelVal,amountG){
  if(!amountG)return 0;
  // 過去データがあれば平均歩留まりを使う
  const pastRoasts=S.roastRecords.filter(r=>!r.deleted&&r.beanId===beanId&&r.yieldPct&&Math.abs((r.roastLevel||0)-targetLevelVal)<0.3);
  if(pastRoasts.length){
    const avgYield=pastRoasts.reduce((a,r)=>a+r.yieldPct,0)/pastRoasts.length;
    return Math.round(amountG*avgYield/100);
  }
  // デフォルト推定：焙煎度別
  let yieldPct=86;
  if(targetLevelVal<=1.5)yieldPct=87;
  else if(targetLevelVal<=2.0)yieldPct=84;
  else yieldPct=81;
  return Math.round(amountG*yieldPct/100);
}

function getDefaultAdvice(bean,levelLabel){
  const country=countryName(bean.countryId)||(bean.country||'');
  const procs=bean.processIds&&bean.processIds.length?processNamesFromIds(bean.processIds):(bean.processes||[]);
  const isNatural=procs.some(p=>p.toLowerCase().includes('natural')||p.includes('ナチュラル'));
  const isWashed=procs.some(p=>p.toLowerCase().includes('washed')||p.includes('ウォッシュド'));
  const isEthiopia=country.includes('エチオピア')||country.includes('Ethiopia');
  const isKenya=country.includes('ケニア')||country.includes('Kenya');
  const isCentralAmerica=['グアテマラ','コロンビア','コスタリカ','エルサルバドル','ホンジュラス','ニカラグア','メキシコ'].some(c=>country.includes(c));

  const tips=[];

  if(isNatural)tips.push('ナチュラルは発酵香が出やすいため、DTRを短めにコントロールするとクリーンに仕上がります');
  if(isWashed&&isEthiopia)tips.push('エチオピアウォッシュドは花やかな酸味が特徴。浅煎りでは1ハゼ前後の温度上昇に注意');
  if(isKenya)tips.push('ケニアは高密度の豆が多く、1ハゼが強め。温度上昇が緩やかになるよう調整を');
  if(isCentralAmerica)tips.push('中米産は安定した品質。焙煎度に合わせた標準的なプロファイルで問題ありません');

  if(levelLabel==='浅煎り'||levelLabel==='中浅煎り')tips.push('浅煎り領域では1ハゼのタイミングを慎重に観察してください');
  if(levelLabel==='深煎り')tips.push('深煎りでは2ハゼ後の排気に注意し、煙の管理を確実に');

  return tips.length?tips.join(' / '):levelLabel+'の標準プロファイルで焙煎してください。過去データがないため汎用アドバイスを表示しています。';
}

function getPlanSessionWarnings(orderedItems){
  const warnings=[];
  if(orderedItems.length===0)return warnings;

  // 深→浅の順序警告
  for(let i=1;i<orderedItems.length;i++){
    if(orderedItems[i].roastLevelVal<orderedItems[i-1].roastLevelVal){
      const prev=S.beans.find(b=>b.id===orderedItems[i-1].beanId);
      const curr=S.beans.find(b=>b.id===orderedItems[i].beanId);
      warnings.push(`深煎り（${prev?prev.name:'前の豆'}）の後に浅煎り（${curr?curr.name:'次の豆'}）を焙煎します。ドラム内の残熱に注意してください。`);
    }
  }

  // Wet-Hulledが最後でない場合の警告（calcRoastOrderで並び替え済みなので通常出ない）
  const hasWH=orderedItems.some(item=>_hasWetHulled(item.beanId));
  if(hasWH){
    warnings.push('スマトラ式（Wet-Hulled）の豆は水分が多いため、最後に焙煎するか機器の温度安定を確認してください。');
  }

  // 総量警告
  const totalAmount=orderedItems.reduce((a,item)=>a+(item.amount||0),0);
  if(totalAmount>1000)warnings.push(`セッション総投入量が${totalAmount}gです。機器の容量を超えないよう確認してください。`);

  // 多数の豆警告
  if(orderedItems.length>=4)warnings.push(`${orderedItems.length}種類の豆を連続焙煎します。各バッチ間に適切な冷却時間を設けてください。`);

  return warnings;
}

// ===== Gemini API =====
async function callGeminiForAnalysis(prompt){
  const key=typeof getGeminiKey==='function'?getGeminiKey():null;
  if(!key)return null;
  try{
    const res=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
                            generationConfig:{maxOutputTokens:256}})}
    );
    const d=await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text??null;
  }catch(e){console.warn('Gemini API error:',e);return null;}
}
