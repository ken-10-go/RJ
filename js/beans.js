// ================================================================
// beans.js — Bean CRUD・在庫管理・詳細モーダル
// ================================================================
// CRUD    : saveBean, clearBeanForm, editBean, copyBean,
//           cancelEditBean, deleteBean, previewBeanPhoto
// Helpers : roastSeqNum, beanSeqNum, beanRemainingGrams
// Detail  : openBeanDetail, closeBeanDetail
// Render  : renderBeans, updateBeanSelect, updateRoastLevelHint
//
// ⚠ 新フィールドを Bean に追加したら以下も更新すること:
//    saveBean / clearBeanForm / editBean / openBeanDetail
//    constants.js の @typedef {Bean}
// ================================================================

// ===== BEANS CRUD =====
function saveBean(){
  const name=document.getElementById('b-name').value.trim();
  if(!name){toast('豆の名前を入力してください');return;}
  const editId=document.getElementById('b-edit-id').value;
  // ID管理フィールド（新）＋ 文字列フィールド（後方互換）を両方保持
  const bean={
    id:editId?parseInt(editId):Date.now(),
    name,
    countryId:S.beanSelectedCountryId,
    country:countryName(S.beanSelectedCountryId),
    farm:document.getElementById('b-farm').value,
    varietyIds:[...S.beanSelectedVarietyIds],
    varieties:varietyNamesFromIds(S.beanSelectedVarietyIds),
    processIds:[...S.beanSelectedProcessIds],
    processes:processNamesFromIds(S.beanSelectedProcessIds),
    roastLevelVals:[...S.beanSelectedRLVals],
    roastLevels:rlLabelsFromVals(S.beanSelectedRLVals),
    shop:document.getElementById('b-shop').value,
    amount:document.getElementById('b-amount').value,
    purchaseDate:document.getElementById('b-purchase-date').value,
    price:document.getElementById('b-price').value,
    score:document.getElementById('b-score').value,
    taste:document.getElementById('b-taste').value,
    memo:document.getElementById('b-memo').value,
    photo:S.beanPhotoData||null,
    stockGrams:(()=>{const v=document.getElementById('b-stock-override').value.trim();return v!==''?parseFloat(v):undefined;})(),
  };
  pushUndo();
  if(editId){const i=S.beans.findIndex(b=>b.id===parseInt(editId));if(i>=0)S.beans[i]=bean;}
  else S.beans.push(bean);
  clearBeanForm();renderBeans();updateBeanSelect();
  toast(editId?'豆情報を更新しました':'豆「'+bean.name+'」を登録しました');
  masterDirtyTypes.forEach(t=>saveMasterToDrive(t));masterDirtyTypes.clear();
  autoSync();
}

function clearBeanForm(){
  ['b-name','b-farm','b-price','b-score','b-taste','b-memo','b-purchase-date','b-stock-override'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('b-amount').value='1000';
  document.getElementById('b-edit-id').value='';
  document.getElementById('b-photo-preview').style.display='none';
  document.getElementById('b-photo').value='';
  document.getElementById('bean-form-title').textContent='豆を登録';
  document.getElementById('bean-save-btn').textContent='豆を登録する';
  document.getElementById('bean-cancel-btn').style.display='none';
  S.beanSelectedCountryId=null;S.beanSelectedProcessIds=[];S.beanSelectedRLVals=[];S.beanPhotoData=null;S.beanSelectedVarietyIds=[];
  renderBeanForm();
}

function editBean(id){
  const b=S.beans.find(b=>b.id===id);if(!b)return;
  document.getElementById('b-name').value=b.name||'';
  document.getElementById('b-farm').value=b.farm||'';
  document.getElementById('b-shop').value=b.shop||'';
  document.getElementById('b-amount').value=b.amount||'';
  document.getElementById('b-purchase-date').value=b.purchaseDate||'';
  document.getElementById('b-price').value=b.price||'';
  document.getElementById('b-score').value=b.score||'';
  document.getElementById('b-taste').value=b.taste||'';
  document.getElementById('b-memo').value=b.memo||'';
  document.getElementById('b-edit-id').value=b.id;
  document.getElementById('b-stock-override').value=b.stockGrams!=null?b.stockGrams:'';
  // Phase2済みならID直接、未移行なら名前でルックアップ
  S.beanSelectedCountryId=b.countryId!==undefined?b.countryId:
    (b.country?(S.master.countries.find(r=>r.name===b.country&&r.enabled!==false)||{}).id||null:null);
  S.beanSelectedProcessIds=b.processIds!==undefined?[...b.processIds]:
    (b.processes||[]).map(nm=>(S.master.processes.find(r=>r.name===nm&&r.enabled!==false)||{}).id).filter(Boolean);
  S.beanSelectedRLVals=b.roastLevelVals!==undefined?[...b.roastLevelVals]:
    (b.roastLevels||[]).map(lbl=>{const m=lbl.match(/^\[(\d+\.\d+)\]/);return m?parseFloat(m[1]):null;}).filter(v=>v!==null);
  S.beanSelectedVarietyIds=b.varietyIds!==undefined?[...b.varietyIds]:
    (b.varieties||[]).map(nm=>(S.master.varieties.find(r=>r.name===nm&&r.enabled!==false)||{}).id).filter(Boolean);
  if(b.photo){const img=document.getElementById('b-photo-preview');img.src=b.photo;img.style.display='block';S.beanPhotoData=b.photo;}
  document.getElementById('bean-form-title').textContent='豆を編集';
  document.getElementById('bean-save-btn').textContent='更新する';
  document.getElementById('bean-cancel-btn').style.display='block';
  renderCountryDropdown();renderProcessDropdown();renderRLDropdown();renderVarietyDropdown();
  document.getElementById('tab-beans').scrollTo({top:0,behavior:'smooth'});
}

function copyBean(id){
  const b=S.beans.find(b=>b.id===id);if(!b)return;
  const copy={...b,id:Date.now(),name:b.name+' (コピー)',photo:b.photo||null,
    processIds:[...(b.processIds||[])],processes:[...(b.processes||[])],
    roastLevelVals:[...(b.roastLevelVals||[])],roastLevels:[...(b.roastLevels||[])],
    varietyIds:[...(b.varietyIds||[])],varieties:[...(b.varieties||[])]};
  S.beans.push(copy);renderBeans();updateBeanSelect();
  toast('「'+b.name+'」をコピーしました');saveLocal(); // コピーはlocalのみ、登録時に同期
}

function cancelEditBean(){clearBeanForm();}

function deleteBean(id){
  if(!confirm('この豆を削除しますか？'))return;
  pushUndo();
  S.beans=S.beans.filter(b=>b.id!==id);renderBeans();updateBeanSelect();toast('削除しました');autoSync();
}

function previewBeanPhoto(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{const img=document.getElementById('b-photo-preview');img.src=e.target.result;img.style.display='block';S.beanPhotoData=e.target.result;};
  r.readAsDataURL(file);
}

function roastSeqNum(roast){
  const same=S.roastRecords.filter(r=>r.beanId===roast.beanId)
    .sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||'')||a.id-b.id);
  const idx=same.findIndex(r=>r.id===roast.id);
  const circled=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
  return same.length>1?' '+(circled[idx]||`(${idx+1})`):'';
}
function beanSeqNum(bean){
  const same=S.beans.filter(b=>b.name===bean.name)
    .sort((a,b)=>(a.purchaseDate||'').localeCompare(b.purchaseDate||'')||a.id-b.id);
  const idx=same.findIndex(b=>b.id===bean.id);
  return same.length>1?` #${idx+1}`:'';
}
function beanRemainingGrams(bean){
  if(bean.stockGrams!=null)return bean.stockGrams;
  if(!bean.amount)return null;
  const used=(S.roastRecords||[]).filter(r=>r.beanId===bean.id)
    .reduce((s,r)=>s+(parseFloat(r.weightBefore)||0),0);
  return Math.max(0,parseFloat(bean.amount)-used);
}
function openBeanDetail(id){
  const b=S.beans.find(b=>b.id===id);if(!b)return;
  const seq=beanSeqNum(b);
  const cname=b.countryId?masterById('countries',b.countryId)?.name||b.country:(b.country||'');
  const procs=b.processIds&&b.processIds.length?processNamesFromIds(b.processIds):(b.processes||[]);
  const varieties=b.varietyIds&&b.varietyIds.length?b.varietyIds.map(vid=>{const r=masterById('varieties',vid);return r?r.name:null;}).filter(Boolean):(b.varieties||[]);
  const rl=b.roastLevelVals&&b.roastLevelVals.length?rlLabelsFromVals(b.roastLevelVals):(b.roastLevels||[]);
  const rem=beanRemainingGrams(b);
  const roasts=(S.roastRecords||[]).filter(r=>r.beanId===b.id);
  const totalUsed=roasts.reduce((s,r)=>s+(parseFloat(r.weightBefore)||0),0);
  const remStr=rem===null?'不明（購入量未設定）':rem===0?'在庫切れ':rem+'g（残）';
  document.getElementById('bdm-title').textContent=(cname?cname+' / ':'')+b.name+seq;
  document.getElementById('bdm-edit-btn').onclick=()=>{closeBeanDetail();editBean(id);};
  const rows=[
    ['産地',cname||'—'],['農場',b.farm||'—'],['品種',varieties.join(', ')||'—'],
    ['精製',procs.join(', ')||'—'],['焙煎度',rl.join(', ')||'—'],
    ['購入日',b.purchaseDate||'—'],['購入量',b.amount?b.amount+'g':'—'],
    ['在庫',remStr],['購入店',b.shop||'—'],
    ['価格',b.price?b.price+'円/100g':'—'],['SCAスコア',b.score||'—'],
    ['テイスト',b.taste||'—'],['メモ',b.memo||'—'],
    ['焙煎回数',roasts.length+'回 / 合計使用 '+totalUsed+'g'],
  ];
  let html=rows.map(([k,v])=>`<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #f0e8e0;"><span style="width:80px;flex-shrink:0;color:#999;font-size:12px;">${k}</span><span style="flex:1;">${v}</span></div>`).join('');
  if(b.photo)html+=`<img src="${b.photo}" style="width:100%;border-radius:8px;margin-top:10px;">`;
  document.getElementById('bdm-body').innerHTML=html;
  const modal=document.getElementById('bean-detail-modal');
  modal.style.display='flex';
  modal.querySelector('.modal').scrollTop=0;
}
function closeBeanDetail(){document.getElementById('bean-detail-modal').style.display='none';}
function renderBeans(){
  const el=document.getElementById('bean-list');
  initFilterButtons();
  let beans=S.beans;
  if(S.filterCountryIds.length)beans=beans.filter(b=>
    S.filterCountryIds.includes(b.countryId)||
    (b.countryId==null&&S.filterCountryIds.some(id=>countryName(id)===b.country)));
  if(S.filterRLVals.length)beans=beans.filter(b=>
    (b.roastLevelVals&&b.roastLevelVals.some(v=>S.filterRLVals.includes(v)))||
    (b.roastLevels&&b.roastLevels.some(lbl=>S.filterRLVals.some(v=>lbl.startsWith('['+v.toFixed(1)+']')))));
  if(S.filterYear)beans=beans.filter(b=>b.purchaseDate&&b.purchaseDate.startsWith(S.filterYear));
  if(S.filterMonth)beans=beans.filter(b=>b.purchaseDate&&b.purchaseDate.slice(5,7)===S.filterMonth);
  const stockOnly=document.getElementById('f-stock-only')?.checked;
  if(stockOnly)beans=beans.filter(b=>{const rem=beanRemainingGrams(b);return rem===null||rem>0;});
  if(!beans.length){el.innerHTML='<div class="empty">該当する豆がありません</div>';return;}
  el.innerHTML=beans.map(b=>{
    try{
      // ID管理優先、なければ旧文字列フォールバック
      const cname=countryName(b.countryId)||(b.country||'');
      const rawProcs=b.processIds&&b.processIds.length?processNamesFromIds(b.processIds):(b.processes||[]);
      const procs=Array.isArray(rawProcs)?rawProcs:[];
      const proc=procs.join(' / ');
      const pd=b.purchaseDate&&typeof b.purchaseDate==='string'?b.purchaseDate.slice(0,7).replace('-','年')+'月購入':'';
      const rem=beanRemainingGrams(b);
      const stockBadge=rem===null?'':`<span class="stock-badge${rem===0?' out':''}">${rem===0?'在庫切れ':'残 '+rem+'g'}</span>`;
      return`<div class="bean-item">
        <div class="bean-name">${cname?cname+' / ':''}${b.name||''}${beanSeqNum(b)}${stockBadge}</div>
        <div class="bean-sub">${[proc,pd].filter(Boolean).join(' | ')}</div>
        <div class="bean-actions">
          <button class="btn btn-sm" onclick="openBeanDetail(${b.id})" style="background:#f5ede6;color:#7c5c3a;border:1px solid #e5d5c8;">詳細</button>
          <button class="btn btn-sm btn-outline" onclick="editBean(${b.id})">編集</button>
          <button class="btn btn-sm btn-copy" onclick="copyBean(${b.id})">コピー</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBean(${b.id})">削除</button>
        </div>
      </div>`;
    }catch(e){
      console.error('renderBeans error bean id='+( b&&b.id)+':',e);
      return`<div class="bean-item">
        <div class="bean-name" style="color:#dc2626;">⚠ ${b&&b.name||'(不明)'}</div>
        <div class="bean-actions">
          <button class="btn btn-sm btn-outline" onclick="editBean(${b&&b.id})">編集</button>
          <button class="btn btn-sm btn-danger" onclick="deleteBean(${b&&b.id})">削除</button>
        </div>
      </div>`;
    }
  }).join('');
}

function updateBeanSelect(){
  const s=document.getElementById('r-bean');
  s.innerHTML=S.beans.length?S.beans.map(b=>{
    const cname=countryName(b.countryId)||(b.country||'');
    const procs=b.processIds&&b.processIds.length?processShortNFromIds(b.processIds):(b.processes||[]);
    const proc=procs.length?' / '+procs.join('·'):'';
    return`<option value="${b.id}">${cname?cname+' / ':''}${b.name}${beanSeqNum(b)}${proc}</option>`;
  }).join(''):'<option>先に豆を登録してください</option>';
  updateRoastLevelHint();
}
function updateRoastLevelHint(){
  const b=S.beans.find(b=>b.id===parseInt(document.getElementById('r-bean').value));
  const el=document.getElementById('r-rl-hint');
  if(!b){el.textContent='';return;}
  const labels=b.roastLevelVals&&b.roastLevelVals.length?rlLabelsFromVals(b.roastLevelVals):(b.roastLevels||[]);
  if(labels.length)el.textContent='推奨: '+labels.join(' / ');else el.textContent='';
}

