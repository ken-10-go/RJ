// ===== roast.js =====
// ===== URL IMPORT =====
function importFromText(){
  const raw=document.getElementById('import-text').value.trim();
  if(!raw){toast('テキストを貼り付けてください');return;}
  const st=document.getElementById('import-status');
  st.style.display='block';

  // ===== 国名マッピング =====
  const COUNTRY_MAP={
    'エチオピア':'Ethiopia','ethiopia':'Ethiopia',
    'ケニア':'Kenya','kenya':'Kenya',
    'グアテマラ':'Guatemala','guatemala':'Guatemala',
    'コロンビア':'Colombia','colombia':'Colombia',
    'ブラジル':'Brazil','brazil':'Brazil',
    'コスタリカ':'Costa Rica','costa rica':'Costa Rica',
    'エルサルバドル':'El Salvador','el salvador':'El Salvador',
    'ホンジュラス':'Honduras','honduras':'Honduras',
    'ペルー':'Peru','peru':'Peru',
    'インドネシア':'Indonesia','indonesia':'Indonesia',
    'イエメン':'Yemen','yemen':'Yemen',
    'パナマ':'Panama','panama':'Panama',
    'ルワンダ':'Rwanda','rwanda':'Rwanda',
    'タンザニア':'Tanzania','tanzania':'Tanzania',
    'メキシコ':'Mexico','mexico':'Mexico',
    'ニカラグア':'Nicaragua','nicaragua':'Nicaragua',
    'ハワイ':'Hawaii','hawaii':'Hawaii',
    'ジャマイカ':'Jamaica','jamaica':'Jamaica',
    'インド':'India','india':'India',
    'タイ':'Thailand','thailand':'Thailand',
  };

  // ===== 精製方法マッピング =====
  const PROCESS_MAP={
    'ウォッシュド':'Washed','washed':'Washed','水洗':'Washed','フリーウォッシュ':'Washed',
    'ナチュラル':'Natural','natural':'Natural','非水洗':'Natural',
    'ハニー':'Honey','honey':'Honey',
    'アナエロビック':'Anaerobic','anaerobic':'Anaerobic','嫌気性':'Anaerobic',
    'ウェットハルド':'Wet-Hulled','wet-hulled':'Wet-Hulled','ギリング':'Wet-Hulled',
    'カーボニック':'Carbonic Maceration','carbonic':'Carbonic Maceration',
  };

  // ===== 品種マッピング =====
  const VARIETY_MAP={
    'ゲイシャ':'Gesha/Geisha','geisha':'Gesha/Geisha','gesha':'Gesha/Geisha',
    'ティピカ':'Typica','typica':'Typica',
    'ブルボン':'Bourbon','bourbon':'Bourbon',
    'カトゥーラ':'Caturra','caturra':'Caturra',
    'カトゥアイ':'Catuai','catuai':'Catuai',
    'エアルーム':'Heirloom','heirloom':'Heirloom','在来種':'Heirloom',
    'sl28':'SL28','sl34':'SL34',
    'パカマラ':'Pacamara','pacamara':'Pacamara',
  };

  const lower=raw.toLowerCase();
  let found={};

  // 国名検出
  for(const [key,val] of Object.entries(COUNTRY_MAP)){
    if(lower.includes(key.toLowerCase())){found.country=val;break;}
  }

  // 精製方法検出（複数可）
  const processes=[];
  for(const [key,val] of Object.entries(PROCESS_MAP)){
    if(lower.includes(key.toLowerCase())&&!processes.includes(val))processes.push(val);
  }
  if(processes.length)found.processes=processes;

  // 品種検出
  for(const [key,val] of Object.entries(VARIETY_MAP)){
    if(lower.includes(key.toLowerCase())){found.variety=val;break;}
  }

  // SCAスコア (例: 86.5, SCA 86, スコア:86.5)
  const scoreM=raw.match(/(?:SCA|スコア|score)[^\d]*(\d{2,3}(?:\.\d)?)/i)
    || raw.match(/(\d{2,3}\.\d)\s*(?:点|pt|SCA)?/);
  if(scoreM)found.score=scoreM[1];

  // 農園名 (例: 農園: Xxx, Farm: Xxx)
  const farmM=raw.match(/(?:農園|農協|farm|estate|cooperative|co-op)[^\S\r\n]*[：:]\s*([^\n,。]+)/i);
  if(farmM)found.farm=farmM[1].trim();

  // 豆の名前: 最初の行または国名+地域名
  const firstLine=raw.split('\n')[0].trim().replace(/https?:\/\/\S+/g,'').trim();
  if(firstLine.length>2&&firstLine.length<60)found.name=firstLine;

  // フレーバーノート (例: フレーバー: ジャスミン、ベリー)
  const tasteM=raw.match(/(?:フレーバー|flavor|taste|テイスト|ノート|note)[^\S\r\n]*[：:]\s*([^\n。]+)/i);
  if(tasteM)found.taste=tasteM[1].trim();

  // 価格 (例: ¥1200, 1,200円, $12)
  const priceM=raw.match(/(?:¥|￥|\$|USD)[\s]*([\d,]+)|(\d[\d,]+)\s*(?:円|yen)/i);
  if(priceM)found.price=(priceM[1]||priceM[2]).replace(/,/g,'');

  // ===== フォームに反映 =====
  let filled=0;

  if(found.name){document.getElementById('b-name').value=found.name;filled++;}

  if(found.country){
    let row=S.master.countries.find(r=>r.name===found.country&&r.enabled!==false);
    if(!row){row={id:Date.now(),name:found.country,enabled:true};S.master.countries.push(row);masterDirtyTypes.add('countries');}
    S.beanSelectedCountryId=row.id;
    renderCountryDropdown();
    filled++;
  }
  if(found.farm){document.getElementById('b-farm').value=found.farm;filled++;}

  if(found.variety){
    let row=S.master.varieties.find(r=>r.name===found.variety&&r.enabled!==false);
    if(!row){row={id:Date.now(),name:found.variety,enabled:true};S.master.varieties.push(row);masterDirtyTypes.add('varieties');}
    S.beanSelectedVarietyIds=[row.id];
    renderVarietyDropdown();
    filled++;
  }
  if(found.processes&&found.processes.length){
    S.beanSelectedProcessIds=found.processes.map(name=>{
      let row=S.master.processes.find(r=>r.name===name&&r.enabled!==false);
      if(!row){row={id:Date.now()+(Math.random()*100|0),name,enabled:true};S.master.processes.push(row);masterDirtyTypes.add('processes');}
      return row.id;
    });
    renderProcessDropdown();
    filled++;
  }
  if(found.score){document.getElementById('b-score').value=found.score;filled++;}
  if(found.taste){document.getElementById('b-taste').value=found.taste;filled++;}
  if(found.price){document.getElementById('b-price').value=found.price;filled++;}

  if(filled>0){
    st.textContent=`${filled}項目を認識しました。確認して登録してください。`;
    st.style.color='var(--c-green)';
  }else{
    st.textContent='情報を認識できませんでした。キーワード（国名・精製方法・スコアなど）が含まれているか確認してください。';
    st.style.color='var(--c-text-muted)';
  }
}

// ===== ROAST SETUP =====
function toggleRoastSetup(){
  S.roastSetupOpen=!S.roastSetupOpen;
  document.getElementById('roast-setup-body').style.maxHeight=S.roastSetupOpen?'400px':'0';
  document.getElementById('roast-setup-arrow').classList.toggle('open',S.roastSetupOpen);
}

// ===== TEMP SLIDER =====
function onTempSlider(){
  const v=document.getElementById('temp-slider').value;
  document.getElementById('slider-val').textContent=v;
}
function adjustSlider(delta){
  const s=document.getElementById('temp-slider');
  const v=Math.min(250,Math.max(20,parseInt(s.value)+delta));
  s.value=v;
  document.getElementById('slider-val').textContent=v;
}
function logSliderTemp(){
  const v=parseInt(document.getElementById('temp-slider').value);
  if(v<20){toast('20°C以上の温度を入力してください');return;}
  recordTemp(v);
  toast(v+'°C を記録しました');
}
function updateSliderFromLast(){
  if(S.tempData.length>0){
    const last=S.tempData[S.tempData.length-1];
    const slider=document.getElementById('temp-slider');
    if(!slider)return;
    slider.value=Math.min(250,Math.max(20,last));
    const sv=document.getElementById('slider-val');if(sv)sv.textContent=slider.value;
  }
}

// ===== ROAST =====
// 焙煎タブの「焙煎開始」ボタン用（オーバーレイを表示してスタート）
function startRoastAndOverlay(){
  if(!S.beans.length){toast('先に豆を登録してください');return;}
  if(!S.currentRoast){
    S.elapsed=0;S.tempData=[];S.timeData=[];S.events=[];S.firstCrackTime=null;
    ocrIntervalSec=OCR_PHASE_INTERVALS.preheat;
    const evLog=document.getElementById('event-log');if(evLog)evLog.innerHTML='';
    const beanId=parseInt(document.getElementById('r-bean').value);
    S.currentRoast={id:Date.now(),beanId,amount:document.getElementById('r-amount').value,washing:document.getElementById('r-washing').checked,startTime:new Date().toISOString(),startTemp:null};
    if(S.roastSetupOpen)toggleRoastSetup();
  }
  // オーバーレイを「準備中」状態で表示（タイマーはまだ開始しない）
  showRoastOverlay();
}
function showRoastOverlay(){
  // カメラが残っていれば停止してからオーバーレイ表示
  if(cameraStream)stopCameraOCR();
  // 使用豆名をオーバーレイに表示
  const bean=S.beans.find(b=>b.id===S.currentRoast.beanId);
  const bl=document.getElementById('ro-bean-lbl');if(bl)bl.textContent=bean?bean.name+beanSeqNum(bean):'—';
  document.getElementById('roast-overlay').classList.add('active');
  const ivlRow=document.getElementById('ocr-interval-row');if(ivlRow)ivlRow.style.display='block';
  updateIntervalSelector();
  if(!S.roastRunning){
    // 準備中状態：「▶ スタート」ボタン表示（カメラは手動起動）
    const pb=document.getElementById('ro-pause-btn');
    if(pb){pb.innerHTML='▶ スタート<br><span style="font-size:10px;opacity:.8;">開始</span>';pb.style.background='#dcfce7';pb.style.borderColor='#bbf7d0';pb.style.color='#16a34a';}
    const sl=document.getElementById('ro-status-lbl');if(sl)sl.textContent='準備中';
    // 新焙煎（elapsed=0）のときチャートとタイムラインをリセット
    if(S.elapsed===0){
      if(roastChart){roastChart.destroy();roastChart=null;}
      initRoastChart();
      renderLiveTempList();
    } else if(!roastChart){
      initRoastChart();
    }
  }
}
function hideRoastOverlay(){
  document.getElementById('roast-overlay').classList.remove('active');
}
function doStartRoast(){
  S.roastRunning=true;
  const pb=document.getElementById('ro-pause-btn');
  if(pb){pb.innerHTML='⏸ 停止<br><span style="font-size:10px;opacity:.8;">一時停止</span>';pb.style.background='#dcfce7';pb.style.borderColor='#bbf7d0';pb.style.color='#16a34a';}
  const sl=document.getElementById('ro-status-lbl');if(sl)sl.textContent='焙煎中';
  S.timerInterval=setInterval(()=>{S.elapsed++;updateTimer();},1000);
  if(!roastChart)initRoastChart();
  // カメラが既に起動中ならOCRカウントダウンを開始（停止中は手動起動）
  if(cameraStream&&!ocrCDInterval){
    ocrCDInterval=setInterval(()=>{
      ocrCD--;
      const oc=document.getElementById('ocr-countdown');if(oc)oc.textContent=ocrCD;
      if(ocrCD<=0){ocrCD=ocrIntervalSec;runOCRCapture();}
    },1000);
  }
  toast('焙煎を開始しました');
}
function toggleRoastPause(){if(!S.roastRunning)resumeRoast();else pauseRoast();}
function toggleRoast(){if(!S.roastRunning)resumeRoast();else pauseRoast();}
function resumeRoast(){
  if(!S.currentRoast){startRoastAndOverlay();return;}
  // オーバーレイを表示してタイマー開始（一時停止からの再開）
  document.getElementById('roast-overlay').classList.add('active');
  doStartRoast();
}
function startRoast(){startRoastAndOverlay();}
function pauseRoast(){
  S.roastRunning=false;
  clearInterval(S.timerInterval);
  // OCRカウントダウンも一時停止（APIリクエスト節約）
  if(ocrCDInterval){clearInterval(ocrCDInterval);ocrCDInterval=null;}
  const pb=document.getElementById('ro-pause-btn');
  if(pb){pb.innerHTML='▶ 再開<br><span style="font-size:10px;opacity:.8;">再開</span>';pb.style.background='#dcfce7';pb.style.borderColor='#bbf7d0';pb.style.color='#16a34a';}
  const sl=document.getElementById('ro-status-lbl');if(sl)sl.textContent='一時停止中';
  const td=document.getElementById('timer-status');if(td)td.textContent='一時停止中';
  const rb=document.getElementById('roast-btn');if(rb)rb.textContent='▶ 再開';
}
function openFinishModal(){
  if(!S.currentRoast){toast('焙煎を開始してください');return;}
  const estRL=rlFromEvents(S.events);
  const sel=document.getElementById('finish-rl');
  sel.innerHTML=ROAST_LEVELS.map(r=>`<option value="${r.val}"${r.val===estRL?' selected':''}>${r.val.toFixed(1)} ${r.ja} — ${r.sub}</option>`).join('');
  const hint=document.getElementById('finish-rl-hint');
  if(estRL){const ev=[...S.events].reverse().find(e=>e.rlVal===estRL);hint.textContent='イベント「'+(ev?ev.label:'')+'」から推定。変更可能です。';}
  else{hint.textContent='イベントなし。手動で選択してください。';sel.value='2.0';}
  document.getElementById('finish-weight-before').value=S.currentRoast.amount||'';
  document.getElementById('finish-weight-after').value='';
  document.getElementById('weight-loss-display').textContent='';
  document.getElementById('finish-modal').classList.add('open');
}
function closeFinishModal(){document.getElementById('finish-modal').classList.remove('open');}
function calcWeightLoss(){
  const b=parseFloat(document.getElementById('finish-weight-before').value);
  const a=parseFloat(document.getElementById('finish-weight-after').value);
  const el=document.getElementById('weight-loss-display');
  if(!isNaN(b)&&!isNaN(a)&&b>0){
    const pct=parseFloat((a/b*100).toFixed(1));
    el.textContent=`歩留まり: ${pct}%（${b}g → ${a}g）`;
  }else el.textContent='';
}
function finishRoast(){
  clearInterval(S.timerInterval);S.roastRunning=false;
  if(ocrCDInterval){clearInterval(ocrCDInterval);ocrCDInterval=null;}
  const ivlRow=document.getElementById('ocr-interval-row');if(ivlRow)ivlRow.style.display='none';
  stopCameraOCR();
  const rl=parseFloat(document.getElementById('finish-rl').value);
  const wb=parseFloat(document.getElementById('finish-weight-before').value)||null;
  const wa=parseFloat(document.getElementById('finish-weight-after').value)||null;
  const yieldPct=wb&&wa?parseFloat((wa/wb*100).toFixed(1)):null;
  const dtr=S.firstCrackTime!==null&&S.elapsed>0?parseFloat(((S.elapsed-S.firstCrackTime)/S.elapsed*100).toFixed(1)):null;
  pushUndo();
  S.roastRecords.push({...S.currentRoast,endTime:new Date().toISOString(),duration:S.elapsed,tempData:[...S.tempData],timeData:[...S.timeData],events:[...S.events],finalTemp:S.tempData.length?S.tempData[S.tempData.length-1]:null,roastLevel:rl,weightBefore:wb,weightAfter:wa,yieldPct,dtr,memo:''});
  S.currentRoast=null;S.elapsed=0;S.tempData=[];S.timeData=[];S.events=[];S.firstCrackTime=null;
  const rtd=document.getElementById('ro-timer');if(rtd)rtd.textContent='00:00';
  const rsl=document.getElementById('ro-status-lbl');if(rsl)rsl.textContent='完了';
  ['ro-temp','ro-ror','ro-dev'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
  const evLog=document.getElementById('event-log');if(evLog)evLog.innerHTML='';
  const roEvLog=document.getElementById('ro-event-log-content');if(roEvLog)roEvLog.innerHTML='';
  if(roastChart){roastChart.destroy();roastChart=null;}
  if(!S.roastSetupOpen)toggleRoastSetup();
  const mbEl=document.getElementById('roast-mini-bar');if(mbEl)mbEl.style.display='none';
  hideRoastOverlay();
  closeFinishModal();updateTasteSelect();
  const rb2=document.getElementById('roast-btn');if(rb2)rb2.textContent='▶ 焙煎開始';
  toast('焙煎完了！');autoSync();
}
function discardRoast(){
  if(!confirm('この焙煎データを破棄して終了しますか？\n記録は保存されません。'))return;
  clearInterval(S.timerInterval);S.roastRunning=false;
  if(ocrCDInterval){clearInterval(ocrCDInterval);ocrCDInterval=null;}
  const ivlRow=document.getElementById('ocr-interval-row');if(ivlRow)ivlRow.style.display='none';
  stopCameraOCR();
  S.currentRoast=null;S.elapsed=0;S.tempData=[];S.timeData=[];S.events=[];S.firstCrackTime=null;
  ocrIntervalSec=OCR_PHASE_INTERVALS.preheat;
  const rtd=document.getElementById('ro-timer');if(rtd)rtd.textContent='00:00';
  const rsl=document.getElementById('ro-status-lbl');if(rsl)rsl.textContent='—';
  ['ro-temp','ro-ror','ro-dev'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
  const evLog=document.getElementById('event-log');if(evLog)evLog.innerHTML='';
  const roEvLog=document.getElementById('ro-event-log-content');if(roEvLog)roEvLog.innerHTML='';
  if(roastChart){roastChart.destroy();roastChart=null;}
  if(!S.roastSetupOpen)toggleRoastSetup();
  const mbEl=document.getElementById('roast-mini-bar');if(mbEl)mbEl.style.display='none';
  hideRoastOverlay();
  closeFinishModal();
  const rb2=document.getElementById('roast-btn');if(rb2)rb2.textContent='▶ 焙煎開始';
  toast('焙煎データを破棄しました');
}
function playBell(){try{const c=new(window.AudioContext||window.webkitAudioContext)();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(880,c.currentTime);g.gain.setValueAtTime(0.4,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1.2);o.start(c.currentTime);o.stop(c.currentTime+1.2);}catch(e){}}
function updateTimer(){
  const m=Math.floor(S.elapsed/60).toString().padStart(2,'0'),s=(S.elapsed%60).toString().padStart(2,'0');
  const ts=m+':'+s;
  const td=document.getElementById('timer-display');if(td)td.textContent=ts;
  const rt=document.getElementById('ro-timer');if(rt)rt.textContent=ts;
  if(S.elapsed>0&&S.elapsed%60===0)playBell();
  if(S.elapsed>=1500){finishRoast();toast('25分経過のため自動停止しました');return;}
  updateMiniBar();
}
function updateMiniBar(){
  const mb=document.getElementById('roast-mini-bar');
  if(!mb||mb.style.display==='none')return;
  const mt=document.getElementById('mini-timer');
  if(mt)mt.textContent=(Math.floor(S.elapsed/60).toString().padStart(2,'0'))+':'+(S.elapsed%60).toString().padStart(2,'0');
  const mp=document.getElementById('mini-temp');
  if(mp)mp.textContent=S.tempData.length?parseFloat(S.tempData[S.tempData.length-1]).toFixed(1)+'°C':'—';
}
function minimizeRoastOverlay(){
  document.getElementById('roast-overlay').classList.remove('active');
  const mb=document.getElementById('roast-mini-bar');
  if(mb){mb.style.display='flex';updateMiniBar();}
}
function restoreRoastOverlay(){
  const mb=document.getElementById('roast-mini-bar');
  if(mb)mb.style.display='none';
  showRoastOverlay();
}
// logManualTemp removed
function recordTemp(temp){
  if(temp<20)return;
  if(!S.roastRunning){toast('▶ スタートを押してから記録されます');return;}
  if(S.currentRoast&&S.currentRoast.startTemp===null)S.currentRoast.startTemp=temp;
  S.tempData.push(temp);S.timeData.push(S.elapsed);
  const tf=parseFloat(temp).toFixed(1);
  const ct=document.getElementById('cur-temp');if(ct)ct.textContent=tf;
  const rt=document.getElementById('ro-temp');if(rt)rt.textContent=tf;
  const n=S.tempData.length;
  const ror=calcROR(S.tempData,S.timeData,n-1);
  const rorStr=ror===null?'—':(ror>0?'+':'')+ror;
  const cr=document.getElementById('cur-ror');if(cr)cr.textContent=rorStr;
  const rr=document.getElementById('ro-ror');if(rr)rr.textContent=rorStr;
  let devStr='—';
  if(S.firstCrackTime!==null&&S.elapsed>S.firstCrackTime)devStr=parseFloat(((S.elapsed-S.firstCrackTime)/S.elapsed*100).toFixed(1))+'%';
  const cd=document.getElementById('cur-dev');if(cd)cd.textContent=devStr;
  const rd=document.getElementById('ro-dev');if(rd)rd.textContent=devStr;
  updateRoastChart();
  renderLiveTempList();
  checkAutoTurningPoint();
  updateSliderFromLast();
}

function renderLiveTempList(){
  const el=document.getElementById('live-temp-list');
  if(!el)return;
  const total=S.tempData.length+S.events.length;
  const cnt=document.getElementById('ro-temp-count');
  if(cnt)cnt.textContent=total?'('+total+')':'';
  // 温度とイベントを統合して時刻順（新しい順）に表示
  const items=[];
  S.tempData.forEach((temp,i)=>items.push({type:'temp',time:S.timeData[i],temp,idx:i}));
  S.events.forEach((ev,i)=>items.push({type:'event',time:ev.time,label:ev.label,idx:i}));
  items.sort((a,b)=>b.time-a.time);
  if(!items.length){el.innerHTML='<div style="color:var(--c-text-muted);padding:8px 0;font-size:13px;text-align:center;">記録なし</div>';return;}
  el.innerHTML=items.map(item=>{
    if(item.type==='temp'){
      return `<div class="live-temp-row">
        <span class="live-temp-time">${ft(item.time)}</span>
        <input class="live-temp-input" type="number" value="${parseFloat(item.temp).toFixed(1)}" step="0.1"
          onchange="editLiveTemp(${item.idx},this.value)" onblur="editLiveTemp(${item.idx},this.value)">
        <span class="live-temp-unit">°C</span>
        <button class="live-temp-del" onclick="deleteLiveTemp(${item.idx})">✕</button>
      </div>`;
    } else {
      const c=(EVENT_STYLE[item.label]||{color:'#9ca3af'}).color;
      const isNote=item.label.startsWith('📝');
      const evT=S.events[item.idx].temp;
      return `<div class="live-temp-row">
        <span class="live-temp-time">${ft(item.time)}</span>
        <span style="flex:1;font-size:12px;color:${c};font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">▲ ${item.label}</span>
        ${evT!=null?`<span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--c-text-muted);white-space:nowrap;">${parseFloat(evT).toFixed(1)}°C</span>`:''}
        <button class="live-temp-del" onclick="deleteEventEntry(${item.idx})">✕</button>
      </div>`;
    }
  }).join('');
}
function editLiveTemp(i,val){
  const v=parseFloat(val);
  if(isNaN(v)||v<20||v>350){toast('20〜350°Cの範囲で入力してください');renderLiveTempList();return;}
  S.tempData[i]=v;
  updateRoastChart();
  const cnt=document.getElementById('ro-temp-count');
  if(cnt)cnt.textContent='('+S.tempData.length+')';
}
function deleteLiveTemp(i){
  S.tempData.splice(i,1);S.timeData.splice(i,1);
  updateRoastChart();renderLiveTempList();
  toast('温度記録を削除しました');
}
function deleteEventEntry(i){
  S.events.splice(i,1);
  updateRoastChart();renderLiveTempList();
  toast('イベントを削除しました');
}
function addMemoEntry(){
  const inp=document.getElementById('memo-input');
  const text=(inp.value||'').trim();
  if(!text){toast('メモを入力してください');return;}
  if(!S.roastRunning){toast('焙煎中のみメモを追加できます');return;}
  S.events.push({time:S.elapsed,label:'📝 '+text,temp:null,rlVal:null});
  inp.value='';
  renderLiveTempList();
  toast('メモを追加しました');
}
function addManualTemp(){
  const inp=document.getElementById('manual-temp-input');
  const val=parseFloat(inp.value);
  if(isNaN(val)||val<20||val>350){toast('有効な温度を入力してください（20〜350°C）');return;}
  if(!S.currentRoast){toast('焙煎を開始してください');return;}
  recordTemp(val);inp.value='';
}
function switchRoTab(tab){
  document.getElementById('ro-tab-cam').classList.toggle('active',tab==='cam');
  document.getElementById('ro-tab-temp').classList.toggle('active',tab==='temp');
  document.getElementById('ro-tab-cam-btn').classList.toggle('active',tab==='cam');
  document.getElementById('ro-tab-temp-btn').classList.toggle('active',tab==='temp');
  if(tab==='temp')renderLiveTempList();
}

// ===== T.Point 自動検出 =====
// Chargeイベント後、3回連続で温度が上昇したら最低温度点をT.Pointとして自動記録
function checkAutoTurningPoint(){
  // Charge済み・未T.Point の場合のみ動作
  const chargeEvent=S.events.find(e=>e.label==='Charge');
  const tpEvent=S.events.find(e=>e.label==='Turning Point');
  if(!chargeEvent||tpEvent)return;

  // Charge以降のインデックスを収集
  const chargeTime=chargeEvent.time;
  const postIdx=S.timeData.map((t,i)=>({t,i})).filter(({t})=>t>=chargeTime);
  if(postIdx.length<4)return; // 最低4点必要

  // 直近3回が連続上昇しているか確認
  const n=postIdx.length;
  const d=postIdx.slice(n-4);
  const rising3=
    S.tempData[d[3].i]>S.tempData[d[2].i]&&
    S.tempData[d[2].i]>S.tempData[d[1].i]&&
    S.tempData[d[1].i]>S.tempData[d[0].i];
  if(!rising3)return;

  // Charge以降の最低温度点を探す
  let minTemp=Infinity,minDataIdx=-1;
  for(const {i} of postIdx){
    if(S.tempData[i]<minTemp){minTemp=S.tempData[i];minDataIdx=i;}
  }
  if(minDataIdx<0)return;

  const minTime=S.timeData[minDataIdx];
  S.events.push({time:minTime,label:'Turning Point',temp:minTemp,rlVal:null});
  addEventLog(ft(minTime),'Turning Point @ '+minTemp+'°C [自動検出]');
  toast('🔄 T.Point 自動検出: '+minTemp+'°C @ '+ft(minTime));
  ocrIntervalSec=OCR_PHASE_INTERVALS.turningPoint;
  updateIntervalSelector();
}
function ft(s){return Math.floor(s/60).toString().padStart(2,'0')+':'+(s%60).toString().padStart(2,'0');}
function markEventWithTemp(label,rlVal){
  if(!S.roastRunning){toast('焙煎中にマークしてください');return;}
  const evTemp=S.tempData.length?S.tempData[S.tempData.length-1]:null;
  S.events.push({time:S.elapsed,label,temp:evTemp,rlVal});
  if(label==='1st Crack Start'&&S.firstCrackTime===null)S.firstCrackTime=S.elapsed;
  applyPhaseInterval(label);
  updateRoastChart();
  renderLiveTempList();
  toast(label+' をマーク');
}
function applyPhaseInterval(label){
  if(label==='Charge'){ocrIntervalSec=OCR_PHASE_INTERVALS.charge;}
  else if(label==='1st Crack Start'){ocrIntervalSec=OCR_PHASE_INTERVALS.firstCrack;}
  updateIntervalSelector();
}
function setOcrInterval(sec){
  ocrIntervalSec=sec;
  updateIntervalSelector();
  toast('測定間隔を '+sec+'秒 に変更');
}
function updateIntervalSelector(){
  document.querySelectorAll('.ivl-btn').forEach(b=>{
    b.classList.toggle('active',Number(b.dataset.sec)===ocrIntervalSec);
  });
}
function addEventLog(time,text){
  const el=document.getElementById('event-log');
  if(el){
    const d=document.createElement('div');d.className='ev';
    d.innerHTML=`<span class="ev-t">${time}</span><span class="ev-x">${text}</span>`;
    el.insertBefore(d,el.firstChild);
    const es=document.getElementById('event-log-section');
    if(es&&es.style.maxHeight&&es.style.maxHeight!=='0px')es.style.maxHeight=es.scrollHeight+'px';
  }
  // オーバーレイ内イベントログにも追加
  const ol=document.getElementById('ro-event-log-content');
  if(ol){
    const d2=document.createElement('div');
    d2.style.cssText='padding:2px 0;border-bottom:1px solid rgba(196,122,58,.06);display:flex;gap:6px;';
    d2.innerHTML=`<span style="color:var(--c-accent);min-width:42px;">${time}</span><span style="color:var(--c-text-muted);">${text}</span>`;
    ol.insertBefore(d2,ol.firstChild);
  }
}
function toggleRoEvLog(){
  const el=document.getElementById('ro-ev-log');
  if(el)el.classList.toggle('open');
}
const crZonePlugin={
  id:'crZone',
  beforeDatasetsDraw:function(chart){
    try{
      var ca=chart.chartArea,sc=chart.scales;
      if(!ca||!sc||!sc.x||!S.timeData.length)return;
      var ctx=chart.ctx;
      function getX(time){
        var closest=-1,minDiff=Infinity;
        for(var i=0;i<S.timeData.length;i++){var d=Math.abs(S.timeData[i]-time);if(d<minDiff){minDiff=d;closest=i;}}
        if(closest<0)return null;
        var lbl=chart.data.labels[closest];
        if(lbl==null)return null;
        return sc.x.getPixelForValue(lbl);
      }
      function drawZone(startEv,endEv,color){
        if(!startEv)return;
        var x1=getX(startEv.time);if(x1===null)return;
        var x2=endEv?getX(endEv.time):ca.right;
        if(x2===null)x2=ca.right;
        var w=x2-x1;if(w<=0)return;
        ctx.save();ctx.fillStyle=color;
        ctx.fillRect(x1,ca.top,w,ca.bottom-ca.top);
        ctx.restore();
      }
      var ev=S.events;
      drawZone(
        ev.find(function(e){return e.label==='1st Crack Start';}),
        ev.find(function(e){return e.label==='1st Crack End';}),
        'rgba(254,240,138,0.35)'
      );
      drawZone(
        ev.find(function(e){return e.label==='2nd Crack Start';}),
        ev.find(function(e){return e.label==='2nd Crack End';}),
        'rgba(254,215,170,0.45)'
      );
    }catch(e){}
  }
};
function initRoastChart(){
  const ctx=document.getElementById('roast-chart').getContext('2d');
  roastChart=new Chart(ctx,{type:'line',data:{labels:[],datasets:[
    {label:'温度(°C)',data:[],borderColor:'#c47a3a',backgroundColor:'rgba(196,122,58,0.08)',borderWidth:2,pointRadius:2,tension:0.4,fill:true,yAxisID:'y'},
    {label:'ROR',data:[],borderColor:'#5a8a3a',borderWidth:1.5,pointRadius:1,tension:0.4,fill:false,yAxisID:'y1'},
    {label:'イベント',data:[],showLine:false,pointStyle:[],pointRadius:[],pointBackgroundColor:[],pointBorderColor:'#fff',pointBorderWidth:1.5,yAxisID:'y'},
  ]},options:{animation:false,responsive:true,plugins:{
    legend:{labels:{color:'#a07850',font:{size:10},filter:(item)=>item.datasetIndex!==2}},
    tooltip:{callbacks:{label:(ctx)=>{
      if(ctx.datasetIndex===2){
        const t=S.timeData[ctx.dataIndex];
        const ev=S.events.find(e=>Math.abs(e.time-t)<5);
        return ev?ev.label+' ('+ft(ev.time)+')':ctx.parsed.y.toFixed(1)+'°C';
      }
      if(ctx.datasetIndex===0)return ctx.parsed.y.toFixed(1)+'°C';
      return 'ROR: '+(ctx.parsed.y!=null?ctx.parsed.y:'—');
    }}}
  },scales:{
    x:{ticks:{color:'#a07850',font:{size:8},maxTicksLimit:8},grid:{color:'rgba(196,122,58,0.08)'}},
    y:{ticks:{color:'#a07850',font:{size:8}},grid:{color:'rgba(196,122,58,0.08)'},position:'left'},
    y1:{ticks:{color:'#5a8a3a',font:{size:8}},grid:{display:false},position:'right'},
  }},plugins:[crZonePlugin]});
}
// ===== ROR計算 ① 60秒ウィンドウ ② 移動平均スムージング ③ 外れ値除外 =====
function calcROR(data, times, endIdx){
  const WINDOW_SEC=60;       // ① 60秒ウィンドウ（°C/min換算）
  const SMOOTH_N=3;          // ② 前後3点の移動平均
  const OUTLIER_DELTA=15.0;  // ③ 1測定で±15°C超は外れ値とみなす

  // ② スムージング：外れ値を除いた直近SMOOTH_N点の平均
  function getSmoothed(idx){
    const start=Math.max(0,idx-SMOOTH_N+1);
    const vals=[];
    for(let i=start;i<=idx;i++){
      // ③ 前の点と比べて急変しすぎる点はスキップ
      if(i>0&&Math.abs(data[i]-data[i-1])>OUTLIER_DELTA)continue;
      vals.push(data[i]);
    }
    if(vals.length===0)return data[idx]; // 全て外れ値の場合は生値をフォールバック
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  }

  if(endIdx<1)return null;

  // ① 60秒前に最も近いインデックスを探す
  const t1=times[endIdx];
  let startIdx=-1;
  for(let i=endIdx-1;i>=0;i--){
    if(t1-times[i]>=WINDOW_SEC){startIdx=i;break;}
  }
  if(startIdx<0){
    // 60秒分のデータがまだない場合は手持ちのデータで計算
    startIdx=0;
  }

  const timeDiff=t1-times[startIdx];
  if(timeDiff<1)return null;

  const curSmooth=getSmoothed(endIdx);
  const pastSmooth=getSmoothed(startIdx);
  // °C/min換算
  return parseFloat(((curSmooth-pastSmooth)/timeDiff*60).toFixed(1));
}

const EVENT_STYLE={
  'Charge':         {color:'#3b82f6'},
  'Steam End':      {color:'#6b7280'},
  'Turning Point':  {color:'#10b981'},
  '1st Crack Start':{color:'#f59e0b'},
  '1st Crack End':  {color:'#d97706'},
  '2nd Crack Start':{color:'#ef4444'},
  '2nd Crack End':  {color:'#b91c1c'},
  'Note':           {color:'#8b5cf6'},
};
function updateRoastChart(){
  if(!roastChart)return;
  roastChart.data.labels=S.timeData.map(t=>ft(t));
  roastChart.data.datasets[0].data=S.tempData;
  roastChart.data.datasets[1].data=S.tempData.map((_,i)=>calcROR(S.tempData,S.timeData,i));
  // イベントマーカーデータセットを再構築
  const evData=S.timeData.map(()=>null);
  const evRadius=S.timeData.map(()=>0);
  const evBg=S.timeData.map(()=>'transparent');
  const evStyle=S.timeData.map(()=>'circle');
  S.events.forEach(ev=>{
    let closest=-1,minDiff=Infinity;
    S.timeData.forEach((t,i)=>{const d=Math.abs(t-ev.time);if(d<minDiff){minDiff=d;closest=i;}});
    if(closest>=0){
      const c=(EVENT_STYLE[ev.label]||{color:'#9ca3af'}).color;
      evData[closest]=S.tempData[closest];
      evRadius[closest]=8;
      evBg[closest]=c;
      evStyle[closest]='triangle';
    }
  });
  const ds2=roastChart.data.datasets[2];
  ds2.data=evData;ds2.pointRadius=evRadius;ds2.pointBackgroundColor=evBg;ds2.pointStyle=evStyle;
  roastChart.update('none');
  // グラフセクションが開いていれば高さを再計算
  const cs=document.getElementById('chart-section');
  if(cs&&cs.style.maxHeight&&cs.style.maxHeight!=='0px')cs.style.maxHeight=cs.scrollHeight+'px';
}

