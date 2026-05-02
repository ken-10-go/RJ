// ================================================================
// storage.js — localStorage・Google Drive API・OCR 設定
// ================================================================
// LCD guide    : drawGuide, initGuideInteraction, hideOcrBox
// OCR mode     : ocrMode, setOcrMode, getGeminiKey, saveGeminiKey,
//                loadGeminiKeyStatus, getApiKey, saveApiKey, loadApiKey
// Local storage: LS_KEY, LS_PENDING, saveLocal, loadLocal,
//                hasPendingSync, clearPending
// Drive consts : DRIVE_FOLDER_PATH, DRIVE_FILE_NAME, DRIVE_*_FILE,
//                BOUNDARY, buildMultipart
// Drive helpers: (Phase 2 JSON file helpers)
// Master CSV   : parseCSV, toCSV, masterFileIds, MASTER_FILE_NAMES,
//                saveMasterFileIds, loadMasterFileIds,
//                saveMasterToDrive, loadFromDrive
// Drive auth   : saveDriveStorage, loadDriveStorage, connectDrive,
//                updateDriveUI, disconnectDrive
// Sync         : autoSync
// Update check : APP_VERSION, checkForUpdate
// Modal init   : initModalSwipe 呼び出し（各モーダル）
// ================================================================

// ===== LCD クロップガイド =====
// ガイド状態: 液晶パネルを囲む1本の横長枠（video座標の相対値 0.0〜1.0）
const guide = {
  x: 0.05,  // 枠の左端
  y: 0.25,  // 枠の上端
  w: 0.70,  // 枠の幅
  h: 0.45,  // 枠の高さ
};

let guideDragging = false;
let guideResizing = false;
let guideDragOX = 0, guideDragOY = 0;
let guideResizeStartX = 0, guideResizeStartY = 0;
let guideStartState = null;

function drawGuide() {
  const canvas = document.getElementById('guide-canvas');
  if (!canvas) return;
  const video = document.getElementById('camera-video');
  const vw = video.offsetWidth || canvas.offsetWidth;
  const vh = video.offsetHeight || canvas.offsetHeight;
  canvas.width = vw * window.devicePixelRatio || vw;
  canvas.height = vh * window.devicePixelRatio || vh;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, vw, vh);

  const rx = guide.x * vw, ry = guide.y * vh;
  const rw = guide.w * vw, rh = guide.h * vh;

  // 枠外を半透明マスク
  ctx.fillStyle = 'rgba(0,0,0,0.40)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.clearRect(rx, ry, rw, rh);

  // 枠線
  ctx.strokeStyle = 'rgba(232,132,30,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

  // 四隅のコーナーマーク
  const cs = Math.min(rw, rh) * 0.18;
  ctx.strokeStyle = 'rgba(232,132,30,1)';
  ctx.lineWidth = 3;
  [[rx,ry],[rx+rw,ry],[rx,ry+rh],[rx+rw,ry+rh]].forEach(([cx,cy],i)=>{
    const sx = i%2===0?1:-1, sy = i<2?1:-1;
    ctx.beginPath();ctx.moveTo(cx+sx*cs,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*cs);ctx.stroke();
  });

  // 操作ヒント（枠上部）
  ctx.fillStyle = 'rgba(232,132,30,0.9)';
  ctx.font = `${Math.max(9,Math.floor(vh*0.045))}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('ドラッグ:移動  ◢:リサイズ', rx + 4, ry - 5);

  // リサイズハンドル（右下）
  const hx = rx + rw, hy = ry + rh;
  ctx.fillStyle = 'rgba(232,132,30,0.9)';
  ctx.fillRect(hx - 16, hy - 16, 16, 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('◢', hx - 8, hy - 3);
}

function initGuideInteraction() {
  const canvas = document.getElementById('guide-canvas');
  if (!canvas) return;

  function toRel(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) / rect.width,
      y: (src.clientY - rect.top) / rect.height,
    };
  }

  function isInResizeHandle(rx, ry) {
    const hx = guide.x + guide.w;
    const hy = guide.y + guide.h;
    return Math.abs(rx - hx) < 0.05 && Math.abs(ry - hy) < 0.05;
  }

  function isInGuide(rx, ry) {
    return rx >= guide.x && rx <= guide.x + guide.w &&
           ry >= guide.y && ry <= guide.y + guide.h;
  }

  function onStart(e) {
    e.preventDefault();
    const { x, y } = toRel(e);
    if (isInResizeHandle(x, y)) {
      guideResizing = true;
      guideResizeStartX = x; guideResizeStartY = y;
      guideStartState = { ...guide };
    } else if (isInGuide(x, y)) {
      guideDragging = true;
      guideDragOX = x - guide.x;
      guideDragOY = y - guide.y;
    }
  }

  function onMove(e) {
    if (!guideDragging && !guideResizing) return;
    e.preventDefault();
    const { x, y } = toRel(e);
    if (guideDragging) {
      guide.x = Math.max(0, Math.min(1 - guide.w, x - guideDragOX));
      guide.y = Math.max(0, Math.min(1 - guide.h, y - guideDragOY));
    } else if (guideResizing) {
      const dx = x - guideResizeStartX;
      const dy = y - guideResizeStartY;
      guide.w = Math.max(0.2, Math.min(1 - guide.x, guideStartState.w + dx));
      guide.h = Math.max(0.1, Math.min(1 - guide.y, guideStartState.h + dy));
    }
    drawGuide();
  }

  function onEnd() { guideDragging = false; guideResizing = false; }

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

function hideOcrBox() {
  const c = document.getElementById('guide-canvas');
  if (c) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); }
}

// ===== GEMINI API KEY & OCR MODE =====
let ocrMode = localStorage.getItem('rj_ocr_mode') || 'gemini'; // 'gemini' | 'seg'

function getGeminiKey(){return localStorage.getItem('rj_gemini_key')||'';}
function saveGeminiKey(){
  const v=document.getElementById('gemini-api-key');
  if(!v)return;
  const key=v.value.trim();
  if(key){
    localStorage.setItem('rj_gemini_key',key);
    v.value='';
    toast('Gemini APIキーを保存しました');
    document.getElementById('gemini-key-status').textContent='✅ キー設定済み';
    setOcrMode('gemini');
  }else{
    localStorage.removeItem('rj_gemini_key');
    toast('Gemini APIキーを削除しました');
    document.getElementById('gemini-key-status').textContent='';
  }
}
function loadGeminiKeyStatus(){
  const st=document.getElementById('gemini-key-status');
  if(!st)return;
  const key=getGeminiKey();
  // Drive Client IDと同様に、保存済みキーをinput欄に復元（type=passwordのためマスク表示）
  const inp=document.getElementById('gemini-api-key');
  if(inp&&key)inp.value=key;
  st.textContent=key?'✅ キー設定済み':'⚠️ 未設定（カメラOCRが動作しません）';
}
function setOcrMode(mode){
  ocrMode=mode;
  localStorage.setItem('rj_ocr_mode',mode);
  const bg=document.getElementById('ocr-mode-gemini');
  const bs=document.getElementById('ocr-mode-seg');
  if(!bg||!bs)return;
  if(mode==='gemini'){
    bg.style.background='var(--c-accent)';bg.style.color='#1a0f07';bg.style.borderColor='var(--c-accent)';bg.style.fontWeight='600';
    bs.style.background='transparent';bs.style.color='var(--c-text)';bs.style.borderColor='var(--border)';bs.style.fontWeight='400';
  }else{
    bs.style.background='var(--c-accent)';bs.style.color='#1a0f07';bs.style.borderColor='var(--c-accent)';bs.style.fontWeight='600';
    bg.style.background='transparent';bg.style.color='var(--c-text)';bg.style.borderColor='var(--border)';bg.style.fontWeight='400';
  }
  ocrLog('OCRモード: '+(mode==='gemini'?'Gemini API':'7セグ認識'));
}

async function readTempWithGemini(canvas){
  const key=getGeminiKey();
  if(!key)return null;
  // cropGuide()で既にリサイズ済みなのでそのまま使用
  const b64=canvas.toDataURL('image/jpeg',0.90).split(',')[1];
  ocrLog('Gemini API 送信中...');
  const resp=await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key='+key,
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[
          {text:'この温度計のLCDディスプレイに表示されている数字を読んでください。整数部と小数部を含む数字のみを返してください（例: 185.5 や 22.9）。単位（°C等）は不要です。読めない場合は ? とだけ返してください。'},
          {inline_data:{mime_type:'image/jpeg',data:b64}}
        ]}],
        generationConfig:{maxOutputTokens:16,temperature:0}
      })
    }
  );
  if(!resp.ok){
    const err=await resp.text();
    throw new Error('Gemini '+resp.status+': '+err.slice(0,100));
  }
  const json=await resp.json();
  const raw=(json.candidates?.[0]?.content?.parts?.[0]?.text||'?').trim();
  ocrLog('Gemini応答: "'+raw+'"');
  if(raw==='?'||raw==='')return null;
  const m=raw.match(/\d+\.?\d*/);
  return m?m[0]:null;
}

// 後方互換（旧コードが参照している場合のため残す）
function getApiKey(){return '';}
function saveApiKey(){}
function loadApiKey(){}

// ===== OFFLINE STORAGE =====
const LS_KEY='rj_offline_data';
const LS_PENDING='rj_pending_sync';
function saveLocal(){
  try{localStorage.setItem(LS_KEY,JSON.stringify({version:4,savedAt:new Date().toISOString(),master:S.master,beans:S.beans,roastRecords:S.roastRecords,tasteRecords:S.tasteRecords}));localStorage.setItem(LS_PENDING,'1');}catch(e){console.warn('saveLocal:',e);}
}
function loadLocal(){
  try{
    const raw=localStorage.getItem(LS_KEY);if(!raw)return false;
    const data=JSON.parse(raw);
    if(data.master){
      // 旧形式（文字列配列）→新形式（{id,name,enabled}）に自動移行
      S.master.countries=migrateMasterArr(data.master.countries||[]);
      S.master.processes=migrateMasterArr(data.master.processes||[]);
      S.master.varieties=migrateMasterArr(data.master.varieties||[]);
      if(data.master.brews)S.master.brews=data.master.brews;
    }
    if(data.beans)S.beans=data.beans;
    if(data.roastRecords)S.roastRecords=data.roastRecords;
    if(data.tasteRecords)S.tasteRecords=data.tasteRecords;
    return true;
  }catch(e){return false;}
}
function hasPendingSync(){return localStorage.getItem(LS_PENDING)==='1';}
function clearPending(){localStorage.removeItem(LS_PENDING);}

// ===== DRIVE =====
const DRIVE_FOLDER_PATH=['Coffee','App'];
const DRIVE_FILE_NAME='roast_journal.json';
const DRIVE_BEANS_FILE='beans.json';
const DRIVE_ROAST_FILE='roast_records.json';
const DRIVE_TASTE_FILE='taste_records.json';
const BOUNDARY='rj_boundary_xyz';
async function ensureFolderPath(token){
  let pid='root';
  for(const name of DRIVE_FOLDER_PATH){
    const q=`name='${name}' and mimeType='application/vnd.google-apps.folder' and '${pid}' in parents and trashed=false`;
    const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+token}});
    const d=await r.json();
    if(d.files&&d.files.length>0){pid=d.files[0].id;}
    else{const cr=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[pid]})});const cd=await cr.json();if(!cd.id)throw new Error('フォルダ作成失敗');pid=cd.id;}
  }
  return pid;
}
function buildMultipart(meta,jsonBody){return`--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${jsonBody}\r\n--${BOUNDARY}--`;}
async function saveOrUpdateFile(token,folderId,jsonBody){
  if(S.driveFileId){
    const r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${S.driveFileId}?uploadType=media`,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:jsonBody});
    const d=await r.json();if(d.error){if(d.error.code===404){S.driveFileId=null;return saveOrUpdateFile(token,folderId,jsonBody);}throw new Error(d.error.message);}return d.id;
  }else{
    const q=`name='${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const sr=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+token}});
    const sd=await sr.json();
    if(sd.files&&sd.files.length>0){S.driveFileId=sd.files[0].id;return saveOrUpdateFile(token,folderId,jsonBody);}
    const body=buildMultipart({name:DRIVE_FILE_NAME,mimeType:'application/json',parents:[folderId]},jsonBody);
    const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':`multipart/related; boundary=${BOUNDARY}`},body});
    const d=await r.json();if(d.error)throw new Error(d.error.message);S.driveFileId=d.id;return d.id;
  }
}
// ===== DRIVE JSON FILE HELPERS (Phase 2) =====
async function fetchJsonFile(token,folderId,fileName){
  const q=`name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const sr=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)',{headers:{Authorization:'Bearer '+token}});
  const sd=await sr.json();
  if(!sd.files||!sd.files.length)return null;
  const fid=sd.files[0].id;
  const fr=await fetch('https://www.googleapis.com/drive/v3/files/'+fid+'?alt=media',{headers:{Authorization:'Bearer '+token}});
  if(!fr.ok)return null;
  const data=await fr.json();
  return{fid,data};
}
async function saveJsonFile(token,folderId,fileName,jsonBody,existingFid){
  // 既存ファイルへの上書き試行（失敗してもフォールスルー）
  if(existingFid){
    try{
      const r=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+existingFid+'?uploadType=media',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:jsonBody});
      const d=await r.json();
      if(!d.error)return existingFid;
      // エラーでも404以外もフォールスルーして検索/作成へ
      console.warn('saveJsonFile PATCH error (fallthrough):',fileName,d.error);
    }catch(e){console.warn('saveJsonFile PATCH exception (fallthrough):',fileName,e);}
  }
  // 同名ファイルをフォルダ内で検索
  const q=`name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const sr=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)',{headers:{Authorization:'Bearer '+token}});
  const sd=await sr.json();
  if(sd.files&&sd.files.length>0){
    const fid=sd.files[0].id;
    const pr=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+fid+'?uploadType=media',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:jsonBody});
    const pd=await pr.json();
    if(pd.error)throw new Error(fileName+' PATCH: '+pd.error.message);
    return fid;
  }
  // 新規作成
  const body=buildMultipart({name:fileName,mimeType:'application/json',parents:[folderId]},jsonBody);
  const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':`multipart/related; boundary=${BOUNDARY}`},body});
  const d=await r.json();if(d.error)throw new Error(fileName+' CREATE: '+d.error.message);
  return d.id;
}
// ===== MASTER CSV =====
function parseCSV(text){
  const lines=text.trim().split('\n');
  if(lines.length<2)return[];
  const headers=lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).filter(l=>l.trim()).map(l=>{
    const vals=l.split(',');
    const obj={};
    headers.forEach((h,i)=>{
      const v=(vals[i]||'').trim();
      if(h==='id')obj[h]=parseInt(v)||Date.now();
      else if(h==='enabled')obj[h]=(v!=='false');
      else obj[h]=v;
    });
    return obj;
  });
}
function toCSV(rows){
  if(!rows||!rows.length)return'id,name,shortN,enabled\n';
  return'id,name,shortN,enabled\n'+rows.map(r=>`${r.id},${(r.name||'').replace(/,/g,'；')},${(r.shortN||'').replace(/,/g,'；')},${r.enabled!==false}`).join('\n');
}
let masterFileIds={countries:null,varieties:null,processes:null};
const MASTER_FILE_NAMES={countries:'master_countries.csv',varieties:'master_varieties.csv',processes:'master_processes.csv'};
function saveMasterFileIds(){
  localStorage.setItem('rj_masterFileIds',JSON.stringify(masterFileIds));
}
function loadMasterFileIds(){
  try{const raw=localStorage.getItem('rj_masterFileIds');if(raw)masterFileIds={...masterFileIds,...JSON.parse(raw)};}catch(e){}
}
async function ensureMasterFolder(token){
  const appFolderId=await ensureFolderPath(token);
  const q=`name='master' and mimeType='application/vnd.google-apps.folder' and '${appFolderId}' in parents and trashed=false`;
  const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+token}});
  const d=await r.json();
  if(d.files&&d.files.length>0)return d.files[0].id;
  const cr=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'master',mimeType:'application/vnd.google-apps.folder',parents:[appFolderId]})});
  const cd=await cr.json();if(!cd.id)throw new Error('masterフォルダ作成失敗');return cd.id;
}
async function saveMasterToDrive(type){
  if(!S.driveToken)return;
  try{
    const folderId=await ensureMasterFolder(S.driveToken);
    const csvBody=toCSV(S.master[type]||[]);
    const fileName=MASTER_FILE_NAMES[type];
    if(masterFileIds[type]){
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${masterFileIds[type]}?uploadType=media`,{method:'PATCH',headers:{Authorization:'Bearer '+S.driveToken,'Content-Type':'text/csv'},body:csvBody});
    }else{
      const q=`name='${fileName}' and '${folderId}' in parents and trashed=false`;
      const sr=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+S.driveToken}});
      const sd=await sr.json();
      if(sd.files&&sd.files.length>0){
        masterFileIds[type]=sd.files[0].id;
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${masterFileIds[type]}?uploadType=media`,{method:'PATCH',headers:{Authorization:'Bearer '+S.driveToken,'Content-Type':'text/csv'},body:csvBody});
      }else{
        const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{Authorization:'Bearer '+S.driveToken,'Content-Type':`multipart/related; boundary=${BOUNDARY}`},body:`--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:fileName,mimeType:'text/csv',parents:[folderId]})}\r\n--${BOUNDARY}\r\nContent-Type: text/csv\r\n\r\n${csvBody}\r\n--${BOUNDARY}--`});
        const d=await r.json();if(d.id)masterFileIds[type]=d.id;
      }
    }
    saveMasterFileIds();
  }catch(e){console.warn('saveMasterToDrive',type,e);}
}
async function loadAllMasterFromDrive(){
  if(!S.driveToken)return;
  try{
    const folderId=await ensureMasterFolder(S.driveToken);
    await Promise.all(['countries','varieties','processes'].map(async type=>{
      const fileName=MASTER_FILE_NAMES[type];
      const q=`name='${fileName}' and '${folderId}' in parents and trashed=false`;
      const sr=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+S.driveToken}});
      const sd=await sr.json();
      if(!sd.files||!sd.files.length)return;
      masterFileIds[type]=sd.files[0].id;
      const fr=await fetch(`https://www.googleapis.com/drive/v3/files/${masterFileIds[type]}?alt=media`,{headers:{Authorization:'Bearer '+S.driveToken}});
      if(!fr.ok)return;
      const text=await fr.text();
      const rows=parseCSV(text);
      if(rows.length)S.master[type]=rows;
    }));
    saveMasterFileIds();
    renderBeanForm();renderBeans();initFilterButtons();
    toast('マスタデータを読み込みました');
  }catch(e){console.warn('loadAllMasterFromDrive',e);}
}

function saveDriveStorage(){['clientId','driveToken','driveUser','driveFileId','tokenExpiry','driveBeansFid','driveRoastFid','driveTasteFid'].forEach(k=>localStorage.setItem('rj_'+k,S[k]||''));}
function loadDriveStorage(){
  ['clientId','driveToken','driveUser','driveFileId','driveBeansFid','driveRoastFid','driveTasteFid'].forEach(k=>{S[k]=localStorage.getItem('rj_'+k)||null;});
  S.tokenExpiry=parseInt(localStorage.getItem('rj_tokenExpiry'))||null;
  if(S.clientId)document.getElementById('client-id-inp').value=S.clientId;
  if(S.driveToken&&S.tokenExpiry&&Date.now()<S.tokenExpiry){document.getElementById('drive-dot').classList.add('connected');document.getElementById('drive-status-txt').textContent='接続中';document.getElementById('drive-status-txt').style.color='var(--c-green)';}
  else if(S.driveToken){S.driveToken=null;toast('トークンが期限切れです。再接続してください');}
}
function connectDrive(){
  const cid=document.getElementById('client-id-inp').value.trim();if(!cid){toast('Client ID を入力してください');return;}
  S.clientId=cid;localStorage.setItem('rj_clientId',cid);
  // ⚠️ redirect_uri は固定値。動的計算（window.location）にすると PWA/ブラウザ起動の違いで不一致になるため変更禁止
  const REDIRECT_URI='https://ken-10-go.github.io/RJ/';
  const params=new URLSearchParams({client_id:cid,redirect_uri:REDIRECT_URI,response_type:'token',scope:'https://www.googleapis.com/auth/drive.file',prompt:'select_account'});
  const w=window.open('https://accounts.google.com/o/oauth2/v2/auth?'+params,'google-auth','width=500,height=600,scrollbars=yes');
  const poll=setInterval(()=>{try{if(!w||w.closed){clearInterval(poll);return;}const hash=w.location.hash;if(hash&&hash.includes('access_token')){clearInterval(poll);w.close();const p=new URLSearchParams(hash.substring(1));S.driveToken=p.get('access_token');S.tokenExpiry=Date.now()+(parseInt(p.get('expires_in')||'3600'))*1000;fetchDriveUser();}}catch(e){}},500);
}
async function fetchDriveUser(){
  try{
    const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+S.driveToken}});
    const d=await r.json();S.driveUser=d.email||d.name||'接続済み';
    document.getElementById('drive-dot').classList.add('connected');document.getElementById('drive-status-txt').textContent='接続中';document.getElementById('drive-status-txt').style.color='var(--c-green)';
    saveDriveStorage();updateDriveUI();toast('Drive に接続しました。データを読み込んでいます...');
    await loadFromDrive();
    if(hasPendingSync()){await syncToDrive();clearPending();toast('オフライン中の変更をDriveに同期しました');}
  }catch(e){toast('接続エラー: '+e.message);}
}
function updateDriveUI(){
  const c=!!S.driveToken;
  document.getElementById('drive-connect-area').style.display=c?'none':'block';
  document.getElementById('drive-connected-area').style.display=c?'block':'none';
  if(c){document.getElementById('drive-user').textContent=S.driveUser||'接続済み';document.getElementById('last-sync-time').textContent=S.lastSync?new Date(S.lastSync).toLocaleString('ja-JP'):'—';document.getElementById('sync-beans-count').textContent=S.beans.length+' 件';document.getElementById('sync-roast-count').textContent=S.roastRecords.length+' 件';document.getElementById('sync-taste-count').textContent=S.tasteRecords.length+' 件';}
}
async function syncToDrive(){
  if(!S.driveToken)return;
  const btn=document.getElementById('sync-btn');if(btn)btn.textContent='保存中...';
  document.getElementById('drive-dot').classList.add('syncing');
  const ts=new Date().toISOString();
  const errors=[];
  try{
    const fid=await ensureFolderPath(S.driveToken);
    const masterFid=await ensureMasterFolder(S.driveToken);

    // マスタCSV保存
    for(const type of ['countries','processes','varieties']){
      await saveMasterToDrive(type).catch(e=>{errors.push(type+': '+e.message);console.error('syncToDrive master '+type,e);});
    }

    // beans.json
    await saveJsonFile(S.driveToken,fid,DRIVE_BEANS_FILE,
      JSON.stringify({version:1,exportedAt:ts,beans:S.beans}),S.driveBeansFid)
      .then(id=>{S.driveBeansFid=id;})
      .catch(e=>{errors.push('beans: '+e.message);console.error('syncToDrive beans',e);});
    // roast_records.json
    await saveJsonFile(S.driveToken,fid,DRIVE_ROAST_FILE,
      JSON.stringify({version:1,exportedAt:ts,roastRecords:S.roastRecords}),S.driveRoastFid)
      .then(id=>{S.driveRoastFid=id;})
      .catch(e=>{errors.push('roast: '+e.message);console.error('syncToDrive roast',e);});
    // taste_records.json
    await saveJsonFile(S.driveToken,fid,DRIVE_TASTE_FILE,
      JSON.stringify({version:1,exportedAt:ts,tasteRecords:S.tasteRecords}),S.driveTasteFid)
      .then(id=>{S.driveTasteFid=id;})
      .catch(e=>{errors.push('taste: '+e.message);console.error('syncToDrive taste',e);});

    S.lastSync=ts;saveDriveStorage();updateDriveUI();
    if(errors.length)toast('一部保存エラー: '+errors.join(' / '));
    else toast('Drive に保存しました');
  }catch(e){console.error('syncToDrive',e);toast('保存エラー: '+e.message);}
  finally{document.getElementById('drive-dot').classList.remove('syncing');if(btn)btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Drive に保存する';}
}
async function loadFromDrive(){
  if(!S.driveToken){toast('まずGoogle Driveに接続してください');return;}
  toast('Drive から読み込み中...');
  try{
    const fid=await ensureFolderPath(S.driveToken);
    // Phase 2: 3ファイルを並行取得
    const [beansRes,roastRes,tasteRes]=await Promise.all([
      fetchJsonFile(S.driveToken,fid,DRIVE_BEANS_FILE),
      fetchJsonFile(S.driveToken,fid,DRIVE_ROAST_FILE),
      fetchJsonFile(S.driveToken,fid,DRIVE_TASTE_FILE),
    ]);
    const hasNew=beansRes||roastRes||tasteRes;
    if(hasNew){
      // 新形式ファイル読み込み
      if(beansRes){S.driveBeansFid=beansRes.fid;if(beansRes.data.beans)S.beans=beansRes.data.beans;}
      if(roastRes){S.driveRoastFid=roastRes.fid;if(roastRes.data.roastRecords)S.roastRecords=roastRes.data.roastRecords;}
      if(tasteRes){S.driveTasteFid=tasteRes.fid;if(tasteRes.data.tasteRecords)S.tasteRecords=tasteRes.data.tasteRecords;}
    }else{
      // レガシー: roast_journal.json にフォールバック
      const q=`name='${DRIVE_FILE_NAME}' and '${fid}' in parents and trashed=false`;
      const sr=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)',{headers:{Authorization:'Bearer '+S.driveToken}});
      const sd=await sr.json();
      if(!sd.files||!sd.files.length){toast('保存データがありません（新規スタート）');return;}
      S.driveFileId=sd.files[0].id;
      const fr=await fetch('https://www.googleapis.com/drive/v3/files/'+S.driveFileId+'?alt=media',{headers:{Authorization:'Bearer '+S.driveToken}});
      if(!fr.ok){toast('保存データがありません（新規スタート）');return;}
      const data=await fr.json();
      if(data.master&&(!data.version||data.version<5)){
        if(data.master.countries)S.master.countries=migrateMasterArr(data.master.countries);
        if(data.master.processes)S.master.processes=migrateMasterArr(data.master.processes);
        if(data.master.varieties)S.master.varieties=migrateMasterArr(data.master.varieties);
      }
      if(data.beans)S.beans=data.beans;
      if(data.roastRecords)S.roastRecords=data.roastRecords;
      if(data.tasteRecords)S.tasteRecords=data.tasteRecords;
    }
    S.lastSync=new Date().toISOString();saveDriveStorage();
    migrateExistingData();
    migrateToPhase2();
    renderBeanForm();renderBeans();updateBeanSelect();updateTasteSelect();updateDriveUI();initFilterButtons();
    const legacyMigrated=!hasNew;
    toast('読み込みました（豆:'+S.beans.length+' 焙煎:'+S.roastRecords.length+'）');
    loadAllMasterFromDrive();
    // 旧形式から読み込んだ場合は即座に3ファイル形式へ書き出す
    if(legacyMigrated){
      toast('Drive を新形式（3ファイル）に移行中...');
      syncToDrive();
    }
  }catch(e){console.error('loadFromDrive',e);toast('読み込みエラー: '+e.message);}
}
function disconnectDrive(){
  S.driveToken=null;S.driveFileId=null;S.driveUser=null;S.lastSync=null;S.tokenExpiry=null;
  ['rj_driveToken','rj_driveUser','rj_driveFileId','rj_tokenExpiry'].forEach(k=>localStorage.removeItem(k));
  document.getElementById('drive-dot').classList.remove('connected','syncing');document.getElementById('drive-status-txt').textContent='未接続';document.getElementById('drive-status-txt').style.color='var(--c-text-muted)';
  updateDriveUI();toast('接続を解除しました');
}
document.addEventListener('DOMContentLoaded',()=>{
  const as=document.getElementById('auto-sync');
  if(as)as.addEventListener('change',function(){document.getElementById('auto-sync-lbl').textContent=this.checked?'ON':'OFF';});
});
function autoSync(){
  if(document.getElementById('auto-sync').checked){
    saveLocal();
    if(S.driveToken)syncToDrive().then(()=>clearPending());
  }
}

// ===== MODAL LISTENERS =====
document.getElementById('record-modal').addEventListener('click',function(e){if(e.target===this)closeRecordModal();});
document.getElementById('edit-roast-modal').addEventListener('click',function(e){if(e.target===this)closeEditRoastModal();});
document.getElementById('finish-modal').addEventListener('click',function(e){if(e.target===this)closeFinishModal();});
initModalSwipe('finish-modal',closeFinishModal);
initModalSwipe('record-modal',closeRecordModal);
initModalSwipe('edit-roast-modal',closeEditRoastModal);



// ===== UPDATE CHECK =====
const APP_VERSION='2.9';
async function checkForUpdate(manual){
  try{
    const r=await fetch('./version.json?t='+Date.now());
    if(!r.ok){if(manual)toast('バージョン確認に失敗しました');return;}
    const d=await r.json();
    const latest=String(d.version||'');
    if(latest&&latest!==APP_VERSION){
      const el=document.getElementById('update-banner');
      if(el){
        document.getElementById('update-banner-ver').textContent='v'+latest;
        el.style.display='flex';
      }
    }else if(manual){
      toast('✅ 最新バージョンです（v'+APP_VERSION+'）');
    }
  }catch(e){if(manual)toast('バージョン確認に失敗しました');}
}

