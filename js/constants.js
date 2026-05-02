// ================================================================
// constants.js — 定数・グローバル State・マスタ管理・マイグレーション
// ================================================================
// Constants : ROAST_LEVELS, FLAVOR_WHEEL, DEFAULT_*, RADAR_LABELS
// Master helpers: toMasterRows, migrateMasterArr, masterNames,
//                 masterById, countryName, processNamesFromIds,
//                 processShortNFromIds, varietyNamesFromIds,
//                 rlLabelsFromVals
// Migration    : migrateExistingData, migrateToPhase2
// State        : S（グローバル state オブジェクト）
// Chart vars   : roastChart, analysisChart, radarChart, compareChart
// ================================================================

// ===== CONSTANTS =====
const ROAST_LEVELS=[
  {val:1.0,ja:'ライト',sub:'1ハゼ開始'},
  {val:1.2,ja:'シナモン',sub:'1ハゼ中'},
  {val:1.5,ja:'ミディアム',sub:'1ハゼ終了'},
  {val:1.7,ja:'ハイ',sub:'1〜2ハゼ間'},
  {val:2.0,ja:'シティ',sub:'2ハゼ開始'},
  {val:2.2,ja:'フルシティ',sub:'2ハゼ中'},
  {val:2.5,ja:'フレンチ',sub:'2ハゼ終了'},
  {val:2.8,ja:'イタリアン',sub:'2ハゼ以降'},
];
const FLAVOR_WHEEL={
  'Floral':['Jasmine','Rose','Chamomile','Lavender','Hibiscus','Black Tea'],
  'Fruity':['Berry','Citrus','Stone Fruit','Tropical','Dried Fruit','Apple/Pear'],
  'Sour/Fermented':['Fermented','Winey','Sour Aromatics','Alcohol'],
  'Green/Vegetative':['Olive Oil','Herb','Vegetal','Beany','Fresh'],
  'Roasted':['Tobacco','Pipe Smoke','Burnt','Cereal','Grain'],
  'Spices':['Anise','Pepper','Clove','Cinnamon','Cardamom','Nutmeg'],
  'Nutty/Cocoa':['Almond','Hazelnut','Peanut','Cocoa','Dark Chocolate','Milk Chocolate'],
  'Sweet':['Brown Sugar','Honey','Vanilla','Caramel','Molasses','Maple'],
  'Other':['Papery','Chemical','Medicinal','Salty','Earthy'],
};
const DEFAULT_COUNTRIES=['エチオピア','ケニア','グアテマラ','コロンビア','ブラジル','コスタリカ','エルサルバドル','ホンジュラス','ペルー','インドネシア','イエメン','パナマ','ルワンダ','タンザニア','メキシコ','ニカラグア'];
const DEFAULT_PROCESSES=['Washed','Natural','Honey','Anaerobic','Wet-Hulled','Carbonic Maceration'];
const DEFAULT_BREWS=['Hand Drip','French Press','Aeropress','Espresso','Cold Brew','Cupping'];
const DEFAULT_VARIETIES=['Heirloom','Typica','Bourbon','Gesha/Geisha','SL28','SL34','Catuai','Caturra','Pacamara','Mundo Novo','Yellow Bourbon','Red Bourbon','Catimor','Sidama','Ruiru 11'];
const RADAR_LABELS=['Acidity','Sweetness','Body','Flavor','Aroma','Aftertaste'];

// マスタ変更追跡（saveBean時にまとめてDrive保存）
let masterDirtyTypes=new Set();

// マスタ初期化: 名前配列 → {id,name,enabled} 配列
function toMasterRows(names){return names.map((name,i)=>({id:i+1,name,enabled:true}));}
// 旧形式（文字列配列）を新形式に変換（後方互換）
function migrateMasterArr(arr){
  if(!arr||!arr.length)return[];
  if(typeof arr[0]==='string')return arr.map((name,i)=>({id:Date.now()+i,name,enabled:true}));
  return arr;
}
// enabled=true のマスタの name 一覧を返すヘルパー
function masterNames(type){return(S.master[type]||[]).filter(r=>r.enabled!==false).map(r=>r.name||r);}
// ID でマスタ行を引くヘルパー（Phase 2）
function masterById(type,id){return(S.master[type]||[]).find(r=>r.id===id);}
function countryName(id){return id!=null?masterById('countries',id)?.name||'':('')}
function processNamesFromIds(ids){return(ids||[]).map(id=>masterById('processes',id)?.name).filter(Boolean);}
function processShortNFromIds(ids){return(ids||[]).map(id=>{const r=masterById('processes',id);return r?(r.shortN||r.name):null;}).filter(Boolean);}
function varietyNamesFromIds(ids){return(ids||[]).map(id=>masterById('varieties',id)?.name).filter(Boolean);}
function rlLabelsFromVals(vals){return(vals||[]).map(v=>{const r=ROAST_LEVELS.find(r=>r.val===v);return r?rlLabel(v):null;}).filter(Boolean);}

// 既存 bean データの整合性マイグレーション
function migrateExistingData(){
  let changed=false;
  S.beans.forEach(b=>{
    // ① roastLevels: 旧形式 "ライト[1.0]" → 新形式 "[1.0] ライト"
    if(b.roastLevels&&b.roastLevels.length){
      const converted=b.roastLevels.map(rl=>{
        if(/^\[\d+\.\d+\]/.test(rl))return rl; // 新形式はそのまま
        const match=ROAST_LEVELS.find(r=>rl.includes(r.ja));
        return match?'['+match.val.toFixed(1)+'] '+match.ja:rl;
      });
      if(JSON.stringify(converted)!==JSON.stringify(b.roastLevels)){b.roastLevels=converted;changed=true;}
    }
    // ② country: マスタにない国名を追加
    if(b.country&&!masterNames('countries').includes(b.country)){
      S.master.countries.push({id:Date.now()+(Math.random()*1000|0),name:b.country,enabled:true});
      masterDirtyTypes.add('countries');changed=true;
    }
    // ③ processes: マスタにない精製方法を追加
    (b.processes||[]).forEach(p=>{
      if(p&&!masterNames('processes').includes(p)){
        S.master.processes.push({id:Date.now()+(Math.random()*1000|0),name:p,enabled:true});
        masterDirtyTypes.add('processes');changed=true;
      }
    });
    // ④ varieties: マスタにない品種を追加
    (b.varieties||[]).forEach(v=>{
      if(v&&!masterNames('varieties').includes(v)){
        S.master.varieties.push({id:Date.now()+(Math.random()*1000|0),name:v,enabled:true});
        masterDirtyTypes.add('varieties');changed=true;
      }
    });
  });
  if(changed){
    saveLocal();
    console.log('migrateExistingData: データ整合性を修正しました');
  }
  return changed;
}

// Phase 2 マイグレーション: テキスト管理 → ID管理
function migrateToPhase2(){
  let changed=false;
  S.beans.forEach(b=>{
    if(b.countryId!==undefined)return; // 移行済み
    changed=true;
    // country 文字列 → countryId
    if(b.country){
      const c=S.master.countries.find(x=>x.name===b.country&&x.enabled!==false);
      b.countryId=c?c.id:null;
    }else{b.countryId=null;}
    // processes 文字列配列 → processIds
    b.processIds=(b.processes||[]).map(name=>{
      const p=S.master.processes.find(x=>x.name===name&&x.enabled!==false);
      return p?p.id:null;
    }).filter(id=>id!==null);
    // varieties 文字列配列 → varietyIds
    b.varietyIds=(b.varieties||[]).map(name=>{
      const v=S.master.varieties.find(x=>x.name===name&&x.enabled!==false);
      return v?v.id:null;
    }).filter(id=>id!==null);
    // roastLevels "[1.0] ライト" → roastLevelVals [1.0]
    b.roastLevelVals=(b.roastLevels||[]).map(label=>{
      const match=label.match(/^\[(\d+\.\d+)\]/);
      return match?parseFloat(match[1]):null;
    }).filter(v=>v!==null);
  });
  if(changed){saveLocal();console.log('migrateToPhase2: ID管理に移行しました');}
  return changed;
}

// ===== TYPE DEFINITIONS =====
/**
 * @typedef {Object} MasterRow
 * @property {number}  id
 * @property {string}  name
 * @property {boolean} [enabled]   - false で非表示（削除の代わり）
 * @property {string}  [shortN]    - 精製方法の略称（processes のみ）
 */

/**
 * @typedef {Object} Bean
 * @property {number}   id               - Date.now() で生成
 * @property {string}   name             - 豆名（必須）
 * @property {number}   [countryId]      - master.countries の id（Phase2以降）
 * @property {string}   [country]        - 後方互換用文字列
 * @property {string}   [farm]           - 農場名
 * @property {number[]} [varietyIds]     - master.varieties の id 配列
 * @property {string[]} [varieties]      - 後方互換用文字列配列
 * @property {number[]} [processIds]     - master.processes の id 配列
 * @property {string[]} [processes]      - 後方互換用文字列配列
 * @property {number[]} [roastLevelVals] - ROAST_LEVELS.val 配列
 * @property {string[]} [roastLevels]    - 後方互換用文字列配列
 * @property {string}   [shop]           - 購入店
 * @property {number}   [amount]         - 購入グラム数
 * @property {number}   [stockGrams]     - 在庫手動上書き（未設定 = 自動計算）
 * @property {string}   [purchaseDate]   - YYYY-MM-DD
 * @property {number}   [price]          - 円/100g
 * @property {number}   [score]          - SCAスコア
 * @property {string}   [taste]          - テイストノート（自由記述）
 * @property {string}   [memo]           - メモ
 * @property {string}   [photo]          - base64 data URL
 */

/**
 * @typedef {Object} RoastEvent
 * @property {number}  time    - 経過秒
 * @property {string}  label   - イベント名（例: '1st Crack Start'）
 * @property {number}  [temp]  - 記録時の温度
 * @property {number}  [rlVal] - 焙煎度 val（ROAST_LEVELS.val）
 */

/**
 * @typedef {Object} RoastRecord
 * @property {number}      id
 * @property {number}      beanId
 * @property {number}      [amount]      - 投入グラム数（文字列の場合あり）
 * @property {boolean}     [washing]     - 水洗い有無
 * @property {string}      [startTime]   - ISO 8601
 * @property {string}      [endTime]     - ISO 8601
 * @property {number}      [duration]    - 焙煎時間（秒）
 * @property {number[]}    tempData      - 温度履歴
 * @property {number[]}    timeData      - 対応する経過秒
 * @property {RoastEvent[]} events       - イベント履歴
 * @property {number}      [roastLevel]  - ROAST_LEVELS.val
 * @property {number}      [weightBefore]- 焙煎前グラム
 * @property {number}      [weightAfter] - 焙煎後グラム
 * @property {number}      [yieldPct]    - 歩留まり%
 * @property {number}      [dtr]         - Development Time Ratio %
 * @property {string}      [memo]
 */

/**
 * @typedef {Object} TasteRecord
 * @property {number}   id
 * @property {number}   roastId         - RoastRecord.id
 * @property {number}   beanId
 * @property {string}   [brewMethod]
 * @property {number}   [stars]         - 総合評価 1〜5
 * @property {number[]} [radarVals]     - RADAR_LABELS 対応の 0〜5 値配列
 * @property {string[]} [flavors]       - FLAVOR_WHEEL キー
 * @property {string}   [memo]
 * @property {string}   [createdAt]     - ISO 8601
 */

// ===== STATE =====
const S={
  beans:[],roastRecords:[],tasteRecords:[],
  master:{
    countries:toMasterRows(DEFAULT_COUNTRIES),
    processes:toMasterRows(DEFAULT_PROCESSES),
    varieties:toMasterRows(DEFAULT_VARIETIES),
    brews:[...DEFAULT_BREWS]
  },
  currentRoast:null,timerInterval:null,elapsed:0,firstCrackTime:null,
  roastRunning:false,tempData:[],timeData:[],events:[],
  stars:0,selectedFlavors:[],activeFlavorCat:null,
  radarVals:[3,3,3,3,3,3],
  beanSelectedCountryId:null,beanSelectedProcessIds:[],beanSelectedRLVals:[],beanSelectedVarietyIds:[],filterPanelOpen:false,
  filterCountryIds:[],filterRLVals:[],filterYear:null,filterMonth:null,beanPhotoData:null,
  driveToken:null,driveFileId:null,driveUser:null,clientId:null,lastSync:null,tokenExpiry:null,
  driveBeansFid:null,driveRoastFid:null,driveTasteFid:null,
  roastSetupOpen:true,
};
let roastChart=null,analysisChart=null,radarChart=null,compareChart=null;
