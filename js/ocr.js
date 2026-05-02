// ===== ocr.js =====
// ===== CAMERA OCR (with debug) =====
const OCR_PHASE_INTERVALS={preheat:30,charge:20,turningPoint:15,firstCrack:10};
let ocrIntervalSec=OCR_PHASE_INTERVALS.preheat;
let cameraStream=null,ocrCDInterval=null,ocrCD=OCR_PHASE_INTERVALS.preheat,ocrBusy=false;
let tesseractWorker=null;

function ocrLog(msg,type=''){
  const log=document.getElementById('ocr-debug-log');
  const d=document.createElement('div');
  d.className='ocr-step'+(type?' '+type:'');
  d.textContent=new Date().toLocaleTimeString('ja-JP')+' '+msg;
  log.insertBefore(d,log.firstChild);
  while(log.children.length>30)log.removeChild(log.lastChild);
}
function copyOcrLog(){
  const log=document.getElementById('ocr-debug-log');
  const lines=[...log.children].map(d=>d.textContent).join('\n');
  navigator.clipboard.writeText(lines).then(()=>toast('ログをコピーしました')).catch(()=>{
    // fallback
    const ta=document.createElement('textarea');
    ta.value=lines;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    toast('ログをコピーしました');
  });
}

// ===== 7セグメント認識エンジン =====
const SEG_PATTERNS={
  '0':[1,1,1,0,1,1,1],
  '1':[0,0,1,0,0,1,0],
  '2':[1,0,1,1,1,0,1],
  '3':[1,0,1,1,0,1,1],
  '4':[0,1,1,1,0,1,0],
  '5':[1,1,0,1,0,1,1],
  '6':[1,1,0,1,1,1,1],
  '7':[1,0,1,0,0,1,0],
  '8':[1,1,1,1,1,1,1],
  '9':[1,1,1,1,0,1,1],
};

function getBright(data,x,y,w){
  const i=(y*w+x)*4;
  return 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
}
function sampleRegion(data,x1,y1,x2,y2,iw,ih){
  let s=0,c=0;
  const sx=Math.max(0,Math.floor(x1)),ex=Math.min(iw-1,Math.floor(x2));
  const sy=Math.max(0,Math.floor(y1)),ey=Math.min(ih-1,Math.floor(y2));
  for(let y=sy;y<=ey;y++)for(let x=sx;x<=ex;x++){s+=getBright(data,x,y,iw);c++;}
  return c>0?s/c:128;
}
function recognizeDigit(data,iw,ih,x0,y0,dw,dh,thresh,darkDigits){
  // 各ゾーンの中央60%だけをサンプリング（端20%ずつ捨てる）
  // ゾーン境界
  const x1=x0, x2=x0+dw, xm=x0+dw*0.5;
  const y1=y0, y2=y0+dh;
  const topEnd    = y0+dh*0.14;
  const upperEnd  = y0+dh*0.44;
  const midStart  = y0+dh*0.44;
  const midEnd    = y0+dh*0.56;
  const lowerStart= y0+dh*0.56;
  const botStart  = y0+dh*0.86;

  // 各ゾーンで端20%を除いた中央60%をサンプリング
  function sampleZone(xa,ya,xb,yb){
    const mx=(xb-xa)*0.20, my=(yb-ya)*0.20;
    return sampleRegion(data, xa+mx, ya+my, xb-mx, yb-my, iw, ih);
  }

  const segs=[
    sampleZone(x1,   y1,          x2,   topEnd     ), // top
    sampleZone(x1,   topEnd,      xm,   upperEnd   ), // tl
    sampleZone(xm,   topEnd,      x2,   upperEnd   ), // tr
    sampleZone(x1,   midStart,    x2,   midEnd     ), // mid
    sampleZone(x1,   lowerStart,  xm,   botStart   ), // bl
    sampleZone(xm,   lowerStart,  x2,   botStart   ), // br
    sampleZone(x1,   botStart,    x2,   y2         ), // bot
  ];

  const ON=darkDigits?(v=>v<thresh?1:0):(v=>v>thresh?1:0);
  const det=segs.map(ON);
  let best=null,bestD=99;
  for(const [d,p] of Object.entries(SEG_PATTERNS)){
    const dist=p.reduce((s,v,i)=>s+(v!==det[i]?1:0),0);
    if(dist<bestD){bestD=dist;best=d;}
  }
  ocrLog(`  seg=[${det.join('')}]→'${best}'(err=${bestD})`);
  return{digit:bestD<=2?best:'?',dist:bestD};
}

function recognizeDisplay(canvas){
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  const id=ctx.getImageData(0,0,w,h);
  const data=id.data;

  // Step1: 全ピクセルの輝度を収集してソート
  const grays=new Float32Array(w*h);
  let rawMin=255,rawMax=0;
  for(let i=0;i<w*h;i++){
    const p=i*4;
    const g=0.299*data[p]+0.587*data[p+1]+0.114*data[p+2];
    grays[i]=g;
    if(g<rawMin)rawMin=g; if(g>rawMax)rawMax=g;
  }
  ocrLog(`実輝度範囲: ${Math.round(rawMin)}-${Math.round(rawMax)}`);

  // パーセンタイル計算（ソートなしで高速に）
  const hist=new Int32Array(256);
  for(let i=0;i<grays.length;i++) hist[Math.min(255,Math.round(grays[i]))]++;
  const totalPx=w*h;
  let cumSum=0, p10=0,p20=0,p50=0,p80=0;
  for(let v=0;v<256;v++){
    cumSum+=hist[v];
    if(cumSum<totalPx*0.10) p10=v;
    if(cumSum<totalPx*0.20) p20=v;
    if(cumSum<totalPx*0.50) p50=v;
    if(cumSum<totalPx*0.80) p80=v;
  }
  ocrLog(`p10=${p10} p20=${p20} p50=${p50} p80=${p80}`);

  // 閾値: 上位20%のピクセルを「セグメントON」とする
  // LCDの数字セグメントは全面積の15〜25%を占める
  // darkDigits=true: 数字が暗い（p80が背景色、p20以下が数字）
  // darkDigits=false: 数字が明るい（p20が背景色、p80以上が数字）
  // 判定: p50が高ければ背景が明るい→数字は暗い
  const darkDigits = p50 > 128;
  const thresh = darkDigits ? p20 : p80;
  ocrLog(`閾値=${thresh} 数字=${darkDigits?'暗(v<'+thresh+')':'明(v>'+thresh+')'}`);
  // 数字=明(背景暗): 数字は平均より明るい → 閾値 = 平均+（ピーク-平均）*0.3
  // 数字=暗(背景明): 数字は平均より暗い  → 閾値 = 平均-（平均-ピーク）*0.3


  // Step2: 行スコアで垂直トリム
  const rowScore=new Float32Array(h);
  for(let y=0;y<h;y++){
    let s=0,cnt=0;
    for(let x=0;x<w;x++){const v=getBright(data,x,y,w);if(v<=8)continue;s+=darkDigits?(v<thresh?1:0):(v>thresh?1:0);cnt++;}
    rowScore[y]=cnt>0?s/cnt:0;
  }
  const rowSmooth=new Float32Array(h);
  for(let y=0;y<h;y++){let s=0,c=0;for(let dy=-3;dy<=3;dy++){if(y+dy>=0&&y+dy<h){s+=rowScore[y+dy];c++;}}rowSmooth[y]=s/c;}
  const maxRS=Math.max(...rowSmooth)||0.01;
  let y1=0,y2=h-1;
  for(let y=0;y<h;y++){if(rowSmooth[y]>maxRS*0.1){y1=Math.max(0,y-5);break;}}
  for(let y=h-1;y>=0;y--){if(rowSmooth[y]>maxRS*0.1){y2=Math.min(h-1,y+5);break;}}
  if(y2-y1<h*0.1){y1=0;y2=h-1;}
  const trimH=y2-y1+1;
  ocrLog(`垂直トリム y=${y1}~${y2} (${trimH}px / ${h}px)`);

  // Step3: 列スコア（トリム後）
  const colScore=new Float32Array(w);
  for(let x=0;x<w;x++){
    let s=0,cnt=0;
    for(let y=y1;y<=y2;y++){const v=getBright(data,x,y,w);if(v<=8)continue;s+=darkDigits?(v<thresh?1:0):(v>thresh?1:0);cnt++;}
    colScore[x]=cnt>0?s/cnt:0;
  }

  // Step4: 移動平均スムージング
  const K=Math.max(2,Math.floor(w*0.03));
  const smooth=new Float32Array(w);
  for(let x=0;x<w;x++){let s=0,c=0;for(let dx=-K;dx<=K;dx++){if(x+dx>=0&&x+dx<w){s+=colScore[x+dx];c++;}}smooth[x]=s/c;}
  const maxCS=Math.max(...smooth)||0.01;
  ocrLog(`列スコア最大=${maxCS.toFixed(3)}`);

  // Step5: 局所的な谷（極小値）で桁を分割
  // サーチ幅を細かくして近接した谷も検出
  const minDigitW=Math.floor(w/6); // 最小桁幅（画像幅の1/6）
  const searchR=Math.max(2,Math.floor(minDigitW*0.3)); // 谷のサーチ半径
  const valleys=[];
  for(let x=minDigitW;x<w-minDigitW;x++){
    let isValley=true;
    for(let dx=1;dx<=searchR;dx++){
      if(smooth[x]>=smooth[x-dx]||smooth[x]>=smooth[x+dx]){isValley=false;break;}
    }
    // 谷の深さ条件: 周辺ピークより5%以上低ければOK（緩い条件）
    let leftPeak=0,rightPeak=0;
    for(let dx=1;dx<=minDigitW;dx++){
      if(x-dx>=0)leftPeak=Math.max(leftPeak,smooth[x-dx]);
      if(x+dx<w)rightPeak=Math.max(rightPeak,smooth[x+dx]);
    }
    const peakAvg=(leftPeak+rightPeak)/2;
    if(isValley&&smooth[x]<peakAvg*0.97){
      if(!valleys.length||x-valleys[valleys.length-1]>minDigitW){
        valleys.push(x);
      }
    }
  }
  ocrLog(`谷: ${valleys.length}個 [${valleys.join(',')}]`);

  let rects=[];
  let prev=0;
  for(const v of valleys){if(v-prev>w*0.03)rects.push({x:prev,w:v-prev});prev=v;}
  rects.push({x:prev,w:w-prev});

  // 幅フィルタ（中央値の30%未満=小数点等を除外）
  if(rects.length>1){
    const ws2=rects.map(d=>d.w).sort((a,b)=>b-a);
    const medW2=ws2[Math.floor(ws2.length/2)];
    rects=rects.filter(d=>d.w>=medW2*0.3);
  }
  ocrLog(`桁候補: ${rects.length}個 幅=${rects.map(d=>d.w).join(',')}`);

  // 幅が大きすぎる桁は複数桁が合体とみなして分割
  {
    const expanded=[];
    for(const dr of rects){
      // 他の桁の中央値の1.4倍以上 → 2桁分
      const otherW=rects.filter(d=>d!==dr).map(d=>d.w);
      const refW=otherW.length?otherW.reduce((a,b)=>a+b,0)/otherW.length:dr.w;
      if(dr.w>refW*1.35&&rects.length<=3){
        const hw=Math.floor(dr.w/2);
        expanded.push({x:dr.x,w:hw},{x:dr.x+hw,w:dr.w-hw});
        ocrLog(`  幅${dr.w}(ref=${Math.round(refW)})を2分割`);
      }else{
        expanded.push(dr);
      }
    }
    rects=expanded;
  }
  ocrLog(`数字桁: ${rects.length}個 (最終)`);

  // Step6: 各桁を認識
  const results=[];
  for(const dr of rects){
    const {digit,dist}=recognizeDigit(data,w,h,dr.x,y1,dr.w,trimH,thresh,darkDigits);
    results.push({digit,dist});
    ocrLog(`  x=${dr.x} w=${dr.w} → '${digit}' (err=${dist})`);
  }

  // Step7: 小数点1桁固定で組み立て
  if(results.length>=3&&results.length<=4){
    const intP=results.slice(0,-1).map(d=>d.digit).join('');
    const decP=results[results.length-1].digit;
    ocrLog('組み立て: '+intP+'.'+decP);
    return intP+'.'+decP;
  }else if(results.length===2){
    return results[0].digit+'.'+results[1].digit;
  }else if(results.length>4){
    const t=results.slice(0,4);
    return t.slice(0,-1).map(d=>d.digit).join('')+'.'+t[t.length-1].digit;
  }
  ocrLog('桁数不足→失敗');
  return null;
}

// キャンバスをクロップ＋アップスケール
function toGrayscaleCanvas(srcCanvas, cropRect){
  const sw=srcCanvas.width, sh=srcCanvas.height;
  const cx=Math.floor(sw*cropRect.x);
  const cy=Math.floor(sh*cropRect.y);
  const cw=Math.max(1,Math.floor(sw*cropRect.w));
  const ch=Math.max(1,Math.floor(sh*cropRect.h));

  // ユーザー指定クロップ後、さらに左右15%・上下20%内側に縮める（黒枠除去）
  const insetX=Math.floor(cw*0.15);
  const insetY=Math.floor(ch*0.20);
  const fx=cx+insetX, fy=cy+insetY;
  const fw=Math.max(1,cw-insetX*2), fh=Math.max(1,ch-insetY*2);
  ocrLog(`クロップ: ${cw}x${ch} → inset後 ${fw}x${fh}`);

  const scale=2;
  const dst=document.createElement('canvas');
  dst.width=fw*scale; dst.height=fh*scale;
  const dctx=dst.getContext('2d');
  dctx.imageSmoothingEnabled=false;
  dctx.drawImage(srcCanvas,fx,fy,fw,fh,0,0,dst.width,dst.height);

  // コントラスト正規化
  const id=dctx.getImageData(0,0,dst.width,dst.height);
  const d=id.data;
  let mn=255,mx=0;
  for(let i=0;i<d.length;i+=4){
    const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    if(g<mn)mn=g; if(g>mx)mx=g;
  }
  const range=mx-mn||1;
  ocrLog(`輝度: ${Math.round(mn)}-${Math.round(mx)}`);
  for(let i=0;i<d.length;i+=4){
    const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    const v=Math.round((g-mn)/range*255);
    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  dctx.putImageData(id,0,0);
  return dst;
}

async function initTesseract(){ /* 未使用 */ }

async function startCameraOCR(){
  // roastRunning ガード削除: 焙煎開始時に自動起動するため
  // ocr-debug は display:none!important で非表示（ソース保持）
  ocrLog('カメラ起動...');
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
    const video=document.getElementById('camera-video');
    video.srcObject=cameraStream;
    await new Promise(resolve=>{video.onloadedmetadata=resolve;});
    await video.play();
    ocrLog(`解像度: ${video.videoWidth}×${video.videoHeight}`,'ok');
    document.getElementById('camera-preview-wrap').style.display='block';
    const oil=document.getElementById('ocr-info-left');if(oil)oil.style.display='block';
    const oicd=document.getElementById('ocr-info-cd');if(oicd)oicd.style.display='block';
    // トグルボタンを「停止」状態に更新
    const tBtn=document.getElementById('cam-toggle-btn');
    if(tBtn){tBtn.style.background='#fee2e2';tBtn.style.borderColor='#fca5a5';tBtn.style.color='#dc2626';}
    const tIcon=document.getElementById('cam-btn-icon');const tText=document.getElementById('cam-btn-text');
    if(tIcon)tIcon.textContent='⏹';if(tText)tText.textContent='読み取り停止';
    
    initGuideInteraction();
    drawGuide();
    ocrCD=5;
    ocrCDInterval=setInterval(()=>{
      ocrCD--;
      document.getElementById('ocr-countdown').textContent=ocrCD;
      if(ocrCD<=0){ocrCD=ocrIntervalSec;runOCRCapture();}
    },1000);
    toast('カメラ読み取り開始');
  }catch(e){
    ocrLog('カメラエラー: '+e.message,'err');
    toast('カメラエラー: '+e.message);
  }
}

function stopCameraOCR(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  clearInterval(ocrCDInterval);ocrCDInterval=null;
  const pw=document.getElementById('camera-preview-wrap');if(pw)pw.style.display='none';
  const oil=document.getElementById('ocr-info-left');if(oil)oil.style.display='none';
  const oicd=document.getElementById('ocr-info-cd');if(oicd)oicd.style.display='none';
  // トグルボタンを「開始」状態に戻す
  const tBtn=document.getElementById('cam-toggle-btn');
  if(tBtn){tBtn.style.background='#fef3c7';tBtn.style.borderColor='';tBtn.style.color='';}
  const tIcon=document.getElementById('cam-btn-icon');const tText=document.getElementById('cam-btn-text');
  if(tIcon)tIcon.textContent='📷';if(tText)tText.textContent='読み取り開始';
  hideOcrBox();
  ocrLog('カメラ停止');
}

// カメラ読み取りトグル（1ボタンで開始/停止）
function toggleCameraOCR(){
  if(cameraStream){stopCameraOCR();}else{startCameraOCR();}
}

// 焙煎タブ内 折りたたみセクションのトグル
function toggleRoastSection(bodyId, arrowId){
  const body=document.getElementById(bodyId);
  const arrow=document.getElementById(arrowId);
  if(!body)return;
  const isOpen=body.style.maxHeight&&body.style.maxHeight!=='0px'&&body.style.maxHeight!=='0';
  if(isOpen){
    body.style.maxHeight='0';
    if(arrow)arrow.classList.remove('open');
  }else{
    body.style.maxHeight=body.scrollHeight+'px';
    if(arrow)arrow.classList.add('open');
    // コンテンツが動的に変わる場合（グラフ）の高さ再計算
    setTimeout(()=>{if(body.style.maxHeight!=='0px')body.style.maxHeight=body.scrollHeight+'px';},320);
  }
}

// 画像ファイルからOCRテスト（ローカル用）
// ===== ガイドベース認識 =====
function cropDigit(srcCanvas, rect) {
  // 1桁分をクロップして正規化
  const {x, y, w, h} = rect;
  const scale = 2;
  const dst = document.createElement('canvas');
  dst.width = w * scale; dst.height = h * scale;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(srcCanvas, x, y, w, h, 0, 0, dst.width, dst.height);
  // コントラスト正規化
  const id = ctx.getImageData(0, 0, dst.width, dst.height);
  const d = id.data;
  let mn=255, mx=0;
  for(let i=0;i<d.length;i+=4){
    const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    if(g<mn)mn=g; if(g>mx)mx=g;
  }
  const range=mx-mn||1;
  for(let i=0;i<d.length;i+=4){
    const g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    const v=Math.round((g-mn)/range*255);
    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  ctx.putImageData(id,0,0);
  return dst;
}

function recognizeOneDigit(digitCanvas) {
  const ctx = digitCanvas.getContext('2d');
  const w = digitCanvas.width, h = digitCanvas.height;
  const id = ctx.getImageData(0,0,w,h);
  const data = id.data;

  // p20/p80で閾値と方向を決定
  const hist = new Int32Array(256);
  for(let i=0;i<w*h;i++){
    const p=i*4;
    hist[Math.min(255,Math.round(0.299*data[p]+0.587*data[p+1]+0.114*data[p+2]))]++;
  }
  const total=w*h;
  let cum=0, p20=0, p80=0;
  for(let v=0;v<256;v++){
    cum+=hist[v];
    if(cum<total*0.20) p20=v;
    if(cum<total*0.80) p80=v;
  }
  // 中央値で方向判定
  let cum2=0; let p50=0;
  for(let v=0;v<256;v++){cum2+=hist[v];if(cum2<total*0.5)p50=v;}
  const darkDigits = p50 > 128;
  const thresh = darkDigits ? p20 + (p80-p20)*0.35 : p20 + (p80-p20)*0.65;

  // 7セグメント認識（中央60%をサンプリング）
  function sampleZone(xa,ya,xb,yb){
    const mx=(xb-xa)*0.20, my=(yb-ya)*0.20;
    const sx=Math.max(0,xa+mx), ex=Math.min(w-1,xb-mx);
    const sy=Math.max(0,ya+my), ey=Math.min(h-1,yb-my);
    let s=0,c=0;
    for(let y=Math.floor(sy);y<=Math.floor(ey);y++)
      for(let x=Math.floor(sx);x<=Math.floor(ex);x++){
        s+=0.299*data[(y*w+x)*4]+0.587*data[(y*w+x)*4+1]+0.114*data[(y*w+x)*4+2];c++;
      }
    return c>0?s/c:128;
  }

  const xm = w*0.5;
  const topEnd=h*0.14, upperEnd=h*0.44;
  const midStart=h*0.44, midEnd=h*0.56;
  const lowerStart=h*0.56, botStart=h*0.86;

  const segs=[
    sampleZone(0,0,         w,topEnd     ),
    sampleZone(0,topEnd,    xm,upperEnd  ),
    sampleZone(xm,topEnd,   w,upperEnd   ),
    sampleZone(0,midStart,  w,midEnd     ),
    sampleZone(0,lowerStart,xm,botStart  ),
    sampleZone(xm,lowerStart,w,botStart  ),
    sampleZone(0,botStart,  w,h          ),
  ];
  const ON=darkDigits?(v=>v<thresh?1:0):(v=>v>thresh?1:0);
  const det=segs.map(ON);

  // セグメントON数をカウント
  const onCount = det.reduce((s,v)=>s+v, 0);
  // ONが1個以下 → 空白桁（表示なし）
  if(onCount <= 1){
    return {digit: ' ', dist: 0, det, thresh, darkDigits};
  }

  let best=null, bestD=99;
  for(const [d,p] of Object.entries(SEG_PATTERNS)){
    const dist=p.reduce((s,v,i)=>s+(v!==det[i]?1:0),0);
    if(dist<bestD){bestD=dist;best=d;}
  }
  return {digit: bestD<=2?best:'?', dist:bestD, det, thresh, darkDigits};
}

// ガイド枠内をクロップして返す（Gemini送信用）
function cropGuide(srcCanvas) {
  const sw = srcCanvas.width, sh = srcCanvas.height;
  const cx = Math.floor(guide.x * sw);
  const cy = Math.floor(guide.y * sh);
  const cw = Math.max(4, Math.floor(guide.w * sw));
  const ch = Math.max(4, Math.floor(guide.h * sh));
  // 送信サイズ: 横400px固定でアスペクト維持（最低高さ40px）
  const outW = 400;
  const outH = Math.max(40, Math.round(outW * ch / cw));
  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  out.getContext('2d').drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, outW, outH);
  ocrLog(`クロップ: ${cw}x${ch} → ${outW}x${outH}`,'ok');
  return out;
}

// ファイルテスト用（Gemini対応）
function testOcrFromFile(input){
  const file=input.files[0];if(!file)return;
  
  ocrLog('--- 画像ファイルテスト (Gemini API) ---');
  const img=new Image();
  const url=URL.createObjectURL(file);
  img.onload=async()=>{
    const canvas=document.getElementById('camera-canvas');
    canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
    canvas.getContext('2d').drawImage(img,0,0);
    URL.revokeObjectURL(url);
    ocrLog(`画像サイズ: ${img.naturalWidth}x${img.naturalHeight}`,'ok');
    drawGuide();
    const cropCanvas=cropGuide(canvas);

    let result=null;
    // Gemini API固定
    if(!getGeminiKey()){
      ocrLog('Gemini APIキー未設定','err');
      document.getElementById('ocr-temp').textContent='識別エラー';
      input.value='';return;
    }
    try{
      result=await readTempWithGemini(cropCanvas);
    }catch(e){
      ocrLog('Geminiエラー: '+e.message,'err');
    }

    ocrLog('認識結果: "'+result+'"');
    if(!result||result==='?'||result.includes('?')){
      ocrLog('識別エラー','err');
      document.getElementById('ocr-temp').textContent='識別エラー';
    }else{
      let nr=result.trim();
      if(/^\d{3,4}$/.test(nr)){nr=nr.slice(0,-1)+'.'+nr.slice(-1);ocrLog('小数点補完: '+result+' → '+nr);}
      const num=parseFloat(nr);
      if(num>=20&&num<=250){
        ocrLog('OK: '+num+'°C','ok');
        document.getElementById('ocr-temp').textContent=num+'°C (テスト)';
      }else{
        ocrLog('範囲外: '+num+'°C','err');
        document.getElementById('ocr-temp').textContent=num+'°C?';
      }
    }
    input.value='';
  };
  img.onerror=()=>{ocrLog('画像読み込みエラー','err');};
  img.src=url;
}

async function runOCRCapture(){
  if(ocrBusy||!cameraStream)return;
  ocrBusy=true;
  const oc2=document.getElementById('ocr-countdown');if(oc2)oc2.textContent='…';
  ocrLog('--- キャプチャ ('+(ocrMode==='gemini'?'Gemini':'7セグ')+') ---');
  try{
    const video=document.getElementById('camera-video');
    const canvas=document.getElementById('camera-canvas');
    if(!video.videoWidth){ocrLog('動画未準備','err');ocrBusy=false;return;}
    canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    canvas.getContext('2d').drawImage(video,0,0);
    ocrLog(`キャプチャ ${video.videoWidth}x${video.videoHeight}`,'ok');
    const cropCanvas=cropGuide(canvas);

    // Gemini API固定（7セグフォールバックなし）
    let result=null;
    if(!getGeminiKey()){
      ocrLog('Gemini APIキー未設定','err');
      document.getElementById('ocr-temp').textContent='識別エラー';
      ocrBusy=false;return;
    }
    try{
      result=await readTempWithGemini(cropCanvas);
    }catch(e){
      ocrLog('Geminiエラー: '+e.message,'err');
    }
    ocrLog(`認識結果: "${result}"`);
    if(!result||result==='?'||result.includes('?')){
      ocrLog('識別エラー','err');
      document.getElementById('ocr-temp').textContent='識別エラー';
    }else{
      let nr=result.trim();
      if(/^\d{3,4}$/.test(nr)){nr=nr.slice(0,-1)+'.'+nr.slice(-1);ocrLog('小数点補完: '+result+' → '+nr);}
      const num=parseFloat(nr);
      const lastTemp=S.tempData.length?S.tempData[S.tempData.length-1]:null;
      const inRange=num>=20&&num<=250;
      const plausible=lastTemp===null||Math.abs(num-lastTemp)<=40;
      if(inRange&&plausible){
        ocrLog('OK: '+num+'°C','ok');
        document.getElementById('ocr-temp').textContent=num.toFixed(1)+'°C';
        if(S.roastRunning)recordTemp(num);
      }else{
        ocrLog('範囲外: '+num+'°C (前回:'+lastTemp+')','err');
        document.getElementById('ocr-temp').textContent=num.toFixed(1)+'°C?';
      }
    }
  }catch(e){
    ocrLog('例外: '+e.message,'err');
    document.getElementById('ocr-temp').textContent='エラー';
  }
  ocrBusy=false;
}
